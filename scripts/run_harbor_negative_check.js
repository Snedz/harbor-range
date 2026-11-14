#!/usr/bin/env node
/**
 * Harbor Range negative control — proof the instrument can fail.
 *
 * The range week's verdict is only worth anything if a bad policy fails
 * it. This control re-runs the seed-1 attack week against a deliberately
 * WEAKENED policy — the least-strawman break: partial payouts. When a
 * quoted payout exceeds a stall's reserve, the weakened stall pays what
 * it has and stays open, instead of refusing in full and closing (the
 * real policy, src/harbor/market.js). Everything else — personas,
 * background traders, settlement, report shape — is the range's own.
 *
 * The weakened market lives only in this file; no shipped code changes.
 * The same solvency invariant the cage check asserts (no stall ever
 * pays out on a sale its reserve cannot cover in full) is then applied
 * to the weakened run. It must reject it.
 *
 * Modes:
 *   (default)          control wrapper: exits 0 only if the weakened
 *                      run is indeed rejected.
 *   --weakened-only    print the weakened run and its FAIL verdict;
 *                      exit 1 (this is the rejected run itself).
 */
import { createAttackerBot, runBuyEverything } from '../src/harbor/attackers.js';
import { findShipwright } from '../src/harbor/market.js';
import { bumpDemand, shipwrightCanTrade, shipwrightQuote } from '../src/harbor/shipwrights.js';
import { createHarborSession, settleHarborBatch } from '../src/harbor/session.js';
import { createMockNearAdapter } from '../src/harbor/near/adapter.js';
import {
  HARBOR_RANGE_DAYS,
  HARBOR_RANGE_TRADERS_PER_DAY,
  validateHarborRangeReport,
} from '../src/harbor/sim.js';

const breaches = [];

/**
 * sellSalvage with exactly one branch changed (marked WEAKENED): the
 * over-reserve sale pays min(quoted, reserve) instead of refusing.
 */
function weakenedSell(session, shipwrightId, goodId, units, trader, actor, day) {
  const states = session.shipwrights;
  const sw = findShipwright(states, shipwrightId);
  if (!sw || !shipwrightCanTrade(sw)) return { ok: false, error: 'Shipwright is closed.' };
  if (!sw.buys.includes(goodId)) return { ok: false, error: 'They do not buy that good.' };
  const qty = units | 0;
  if (qty <= 0) return { ok: false, error: 'Quantity must be positive.' };
  if ((trader.salvage[goodId] ?? 0) < qty) return { ok: false, error: 'Not enough salvage.' };

  const quote = shipwrightQuote(sw, goodId, 'sell');
  const quotedPayout = quote.price * qty;
  const reserveBefore = sw.wallet.coin ?? 0;
  // WEAKENED: partial payout instead of refuse-in-full-and-close.
  const paid = Math.min(quotedPayout, reserveBefore);
  if (quotedPayout > reserveBefore) {
    breaches.push({ day, actor, shipwright: sw.id, good: goodId, units: qty, quotedPayout, reserveBefore, paid });
  }

  trader.salvage[goodId] -= qty;
  trader.coin += paid;
  sw.wallet.coin -= paid;
  sw.wallet[goodId] = (sw.wallet[goodId] ?? 0) + qty;
  bumpDemand(sw, goodId, qty);
  const ledger = { kind: 'sell', shipwright: sw.accountId, goodId, units: qty, coin: paid };
  session.pendingLedger.push(ledger);
  return { ok: true, payout: paid, quotedPayout, partial: paid < quotedPayout, quote, ledger };
}

function countOpenStalls(session) {
  return session.shipwrights.filter((sw) => sw.open).length;
}

function weakenedIronFlooder(session, bot, day) {
  const events = [];
  let trades = 0;
  for (let i = 0; i < 24 && bot.salvage.iron > 0; i++) {
    const before = countOpenStalls(session);
    const result = weakenedSell(session, 'ironmonger', 'iron', Math.min(12, bot.salvage.iron), bot, 'iron_flooder', day);
    trades += 1;
    events.push({ ok: result.ok, error: result.error ?? null, openStalls: countOpenStalls(session) });
    if (countOpenStalls(session) < before) break;
  }
  return { attacker: 'iron_flooder', trades, openStalls: countOpenStalls(session), events };
}

function weakenedWashTrader(session, bot, day) {
  const events = [];
  let trades = 0;
  const pattern = [
    ['timberyard', 'timber', 6],
    ['timberyard', 'canvas', 4],
    ['timberyard', 'timber', 8],
    ['timberyard', 'canvas', 6],
  ];
  for (let round = 0; round < 6; round++) {
    for (const [sw, good, units] of pattern) {
      if ((bot.salvage[good] ?? 0) < units) continue;
      const result = weakenedSell(session, sw, good, units, bot, 'wash_trader', day);
      trades += 1;
      events.push({ ok: result.ok, good, openStalls: countOpenStalls(session) });
    }
  }
  return { attacker: 'wash_trader', trades, openStalls: countOpenStalls(session), events };
}

// Background traders: the range sim's own script and LCG (sim.js), with
// the weakened sell swapped in.
const SCRIPT = Object.freeze([
  { shipwright: 'ironmonger', good: 'iron', units: 2 },
  { shipwright: 'timberyard', good: 'timber', units: 3 },
  { shipwright: 'coinhouse', good: 'canvas', units: 1 },
  { shipwright: 'ironmonger', good: 'iron', units: 4 },
  { shipwright: 'timberyard', good: 'timber', units: 2 },
]);
function createRng(seed) {
  let rng = seed >>> 0;
  return () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng / 0x100000000;
  };
}

function runWeakenedWeek(seed = 1) {
  const session = createHarborSession();
  const adapter = createMockNearAdapter({ network: 'testnet' });
  const next = createRng(seed);
  const attackReports = [];
  for (let day = 0; day < HARBOR_RANGE_DAYS; day++) {
    const attackerId = ['iron_flooder', 'wash_trader', 'buy_everything'][day % 3];
    const bot = createAttackerBot(attackerId);
    if (attackerId === 'iron_flooder') attackReports.push(weakenedIronFlooder(session, bot, day));
    else if (attackerId === 'wash_trader') attackReports.push(weakenedWashTrader(session, bot, day));
    else attackReports.push(runBuyEverything(session, bot));
    for (let t = 0; t < HARBOR_RANGE_TRADERS_PER_DAY; t++) {
      const pick = SCRIPT[Math.floor(next() * SCRIPT.length)];
      session.player.salvage[pick.good] = (session.player.salvage[pick.good] ?? 0) + 1;
      weakenedSell(session, pick.shipwright, pick.good, pick.units, session.player, 'background', day);
    }
    settleHarborBatch(session, adapter);
  }
  const openStalls = countOpenStalls(session);
  return {
    session,
    report: {
      days: HARBOR_RANGE_DAYS,
      seed,
      playerCoin: session.player.coin,
      settlements: adapter.receipts.length,
      openStalls,
      stallsSurvivedAttack: openStalls >= 1,
      attackReports,
    },
  };
}

const weakenedOnly = process.argv.includes('--weakened-only');
const { session, report } = runWeakenedWeek(1);
const schema = validateHarborRangeReport(report);
const drainedOpen = session.shipwrights.filter((sw) => sw.open && (sw.wallet.coin ?? 0) === 0);
const first = breaches[0];

console.log('Harbor Negative Control — weakened policy: partial payouts allowed');
console.log('(an over-reserve sale pays what the stall has and the stall stays open,');
console.log(' instead of the real policy: refuse in full, close, keep the reserve)');
console.log('');
console.log('Weakened attack log (seed 1, 7 days)');
for (let day = 0; day < report.attackReports.length; day++) {
  const entry = report.attackReports[day];
  const refused = entry.events.filter((e) => !e.ok).length;
  const volume = entry.trades ?? entry.attempts ?? 0;
  const kind = entry.trades !== undefined ? 'trades' : 'attempts';
  console.log(
    `  day ${day}  ${entry.attacker.padEnd(15)} ${String(volume).padStart(2)} ${kind}, ` +
      `${refused} refused, stalls open after: ${entry.openStalls}`,
  );
}
console.log('');
console.log(`Reserve breaches (sale quoted above the stall's reserve, paid partially): ${breaches.length}`);
for (const b of breaches) {
  console.log(
    `  day ${b.day}  ${b.actor.padEnd(15)} ${b.units} ${b.good} -> ${b.shipwright}: ` +
      `quoted payout ${b.quotedPayout}, reserve ${b.reserveBefore}, paid ${b.paid}`,
  );
}
console.log('');
console.log(
  `stalls drained to 0 coin while still flagged open: ${drainedOpen.length}` +
    (drainedOpen.length ? ` (${drainedOpen.map((sw) => sw.id).join(', ')})` : ''),
);
console.log(`schema validation (validateHarborRangeReport): ${schema.ok ? 'ok — the report is well-formed' : schema.errors.join('; ')}`);
console.log(
  `Harbor Range FAIL seed=1 openStalls=${report.openStalls} breaches=${breaches.length} ` +
    `(weakened policy: partial payouts` +
    (first
      ? `; first breach day ${first.day}: ${first.actor} sold ${first.units} ${first.good} to ${first.shipwright}, ` +
        `quoted ${first.quotedPayout} against reserve ${first.reserveBefore}, paid ${first.paid} instead of refusing`
      : '') +
    `)`,
);

if (weakenedOnly) {
  process.exit(breaches.length > 0 ? 1 : 0);
}

if (breaches.length > 0 && drainedOpen.length > 0) {
  console.log('');
  console.log(
    `Negative Control PASS: the weakened run is rejected by the solvency invariant ` +
      `(${breaches.length} reserve breaches; the real policy has 0). The instrument can fail a bad policy.`,
  );
  process.exit(0);
}
console.log('');
console.log('Negative Control FAIL: the weakened policy was NOT rejected — the control itself is broken.');
process.exit(1);
