import { createHarborSession, harborSell, settleHarborBatch } from './session.js';
import { createMockNearAdapter } from './near/adapter.js';
import { emptySalvage } from './salvage.js';
import { listQuotes } from './market.js';

/**
 * Harbor Range — the adaptive raider (separate scenario, not part of the week).
 *
 * The three week personas follow fixed scripts. This persona does not: it
 * probes the market's published sell quotes for every stall/good pair,
 * picks the pair whose payout drains a stall fastest, and sizes each lot
 * from what it has observed — the stall's opening reserve is a published
 * market rule (8 coin), so the raider tracks its own extraction per stall
 * and treats `8 - extracted` as the reserve still standing. Every fifth
 * attack trade it deliberately overshoots that estimate by one unit: if
 * its reserve model is wrong, the market's refusal is the correction.
 * A refusal never moves coin — the raider asserts that on every refusal,
 * and asserts on every accepted trade that the payout never exceeded
 * the coin the stall actually held.
 */

export const ADAPTIVE_ATTACKER_ID = 'adaptive_raider';
export const ADAPTIVE_OPENING_RESERVE = 8;
export const ADAPTIVE_MAX_TRADES = 60;
export const ADAPTIVE_OVERSHOOT_EVERY = 5;

function adaptiveBot() {
  const salvage = emptySalvage();
  salvage.iron = 400;
  salvage.timber = 400;
  salvage.canvas = 400;
  return { id: ADAPTIVE_ATTACKER_ID, salvage, coin: 0, upgrades: [] };
}

function countOpenStalls(session) {
  return session.shipwrights.filter((sw) => sw.open).length;
}

function stallById(session, id) {
  return session.shipwrights.find((sw) => sw.id === id) ?? null;
}

/**
 * Read-only probe: the market's own published sell quotes (listQuotes
 * already excludes stalls that cannot trade — closed, or drained to
 * zero), ranked by payout per unit, best first.
 */
export function probeHarborQuotes(session) {
  const probes = [];
  for (const sw of session.shipwrights) {
    for (const quote of listQuotes(session.shipwrights, sw.id, 'sell')) {
      probes.push({ shipwright: sw.id, good: quote.goodId, unitPayout: quote.price });
    }
  }
  probes.sort((a, b) => b.unitPayout - a.unitPayout || a.shipwright.localeCompare(b.shipwright));
  return probes;
}

export function runAdaptiveRaider(session, bot) {
  const events = [];
  const violations = [];
  const extractedByStall = new Map(session.shipwrights.map((sw) => [sw.id, 0]));

  // Probe once up front: stall ranking by its best pair's payout. The
  // raider then commits to one stall at a time in that rank order and
  // never returns to a stall it has left (sequential commitment).
  const probes = probeHarborQuotes(session);
  events.push({ kind: 'probe', pairs: probes.length, best: probes[0] ?? null });
  const stallRank = [];
  for (const p of probes) {
    if (!stallRank.includes(p.shipwright)) stallRank.push(p.shipwright);
  }

  let trades = 0;
  let accepted = 0;
  let refused = 0;
  let overshoots = 0;
  let retargets = 0;
  const lotSizes = [];
  const stallSequence = [];

  for (const stallId of stallRank) {
    const stall = stallById(session, stallId);
    if (trades > 0) retargets += 1;
    let calibrated = false;
    while (trades < ADAPTIVE_MAX_TRADES) {
      // Re-probe this stall's quotes every round: they move as its
      // stock and demand move under the attack.
      const ranked = probeHarborQuotes(session).filter(
        (p) => p.shipwright === stallId && (bot.salvage[p.good] ?? 0) > 0,
      );
      if (ranked.length === 0) break;
      const target = ranked[0];

      const reserveEstimate = ADAPTIVE_OPENING_RESERVE - (extractedByStall.get(stallId) ?? 0);
      // First trade on a fresh target is a 1-unit calibration trade;
      // after that, lots are sized to the reserve believed to remain.
      let lot = calibrated ? Math.max(1, Math.floor(reserveEstimate / target.unitPayout)) : 1;
      calibrated = true;
      const overshoot = trades % ADAPTIVE_OVERSHOOT_EVERY === ADAPTIVE_OVERSHOOT_EVERY - 1;
      if (overshoot) lot += 1;
      lot = Math.min(lot, bot.salvage[target.good] ?? 0);
      if (lot <= 0) break;
      if (overshoot) overshoots += 1;
      lotSizes.push(lot);

      const walletBefore = stall.wallet.coin ?? 0;
      const coinBefore = bot.coin;
      const result = harborSell(session, stallId, target.good, lot, bot);
      trades += 1;
      stallSequence.push(stallId);

      if (result.ok) {
        accepted += 1;
        extractedByStall.set(stallId, (extractedByStall.get(stallId) ?? 0) + result.payout);
        if (result.payout > walletBefore) {
          violations.push(`trade ${trades}: payout ${result.payout} exceeded reserve ${walletBefore} at ${stallId}`);
        }
        if ((stall.wallet.coin ?? 0) !== walletBefore - result.payout || (stall.wallet.coin ?? 0) < 0) {
          violations.push(`trade ${trades}: wallet accounting broken at ${stallId}`);
        }
      } else {
        refused += 1;
        if ((stall.wallet.coin ?? 0) !== walletBefore || bot.coin !== coinBefore) {
          violations.push(`trade ${trades}: refusal moved coin at ${stallId}`);
        }
      }
      events.push({
        kind: 'trade',
        n: trades,
        shipwright: stallId,
        good: target.good,
        lot,
        unitPayout: target.unitPayout,
        overshoot,
        ok: result.ok,
        payout: result.ok ? result.payout : 0,
        error: result.error ?? null,
        openStalls: countOpenStalls(session),
      });
      if (!stall.open) break;
    }
  }

  // Sequential commitment: the stall sequence never revisits a stall.
  let sequentialCommitment = true;
  {
    let last = null;
    const finished = new Set();
    for (const id of stallSequence) {
      if (id !== last) {
        if (finished.has(id)) sequentialCommitment = false;
        if (last !== null) finished.add(last);
        last = id;
      }
    }
  }

  const openStalls = countOpenStalls(session);
  return {
    attacker: ADAPTIVE_ATTACKER_ID,
    probes,
    trades,
    accepted,
    refused,
    overshoots,
    retargets,
    lotSizes,
    extractedCoin: bot.coin,
    sequentialCommitment,
    openStalls,
    stallsSurvivedAttack: openStalls >= 1,
    violations,
    invariantHeld: violations.length === 0,
    events,
  };
}

export function validateAdaptiveReport(report) {
  const errors = [];
  if (!report || typeof report !== 'object') return { ok: false, errors: ['report must be an object'] };
  if (report.attacker !== ADAPTIVE_ATTACKER_ID) errors.push(`attacker must be ${ADAPTIVE_ATTACKER_ID}`);
  if (!(report.trades >= 1)) errors.push('trades must be >= 1');
  if (!(report.accepted >= 1)) errors.push('accepted must be >= 1 (the raider must actually extract coin)');
  if (report.extractedCoin <= 0) errors.push('extractedCoin must be > 0');
  if (report.invariantHeld !== true) errors.push('invariantHeld must be true (a payout exceeded a reserve, or a refusal moved coin)');
  if (report.stallsSurvivedAttack !== true) errors.push('stallsSurvivedAttack must be true (at least one stall open at the end)');
  if (report.sequentialCommitment !== true) errors.push('sequentialCommitment must be true (one stall at a time, never revisited)');
  return { ok: errors.length === 0, errors };
}

export function formatHarborAdaptiveSummary(report) {
  if (!report || typeof report !== 'object') return 'Harbor Adaptive FAIL invalid report';
  const base =
    `trades=${report.trades} accepted=${report.accepted} refused=${report.refused} ` +
    `extracted=${report.extractedCoin} openStalls=${report.openStalls}`;
  if (report.invariantHeld !== true || report.stallsSurvivedAttack !== true) {
    return `Harbor Adaptive FAIL ${base}`;
  }
  return `Harbor Adaptive PASS ${base}`;
}

/** Full adaptive scenario: fresh session, raider, settlement batch at the end. */
export function runHarborAdaptiveCheck() {
  const session = createHarborSession();
  const adapter = createMockNearAdapter({ network: 'testnet' });
  const bot = adaptiveBot();
  const report = runAdaptiveRaider(session, bot);
  settleHarborBatch(session, adapter);
  report.settlements = adapter.receipts.length;
  const validation = validateAdaptiveReport(report);
  if (!validation.ok) {
    throw new Error(`Harbor Adaptive report invalid: ${validation.errors.join('; ')}`);
  }
  return report;
}
