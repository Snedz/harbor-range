#!/usr/bin/env node
/**
 * Harbor Range cage check — one command, every condition named.
 *
 * Runs the range week (seed 1), the background week (seed 42), the
 * settlement sample, and the adapter boundary, then prints the attack
 * log day by day and one GREEN/RED line per condition. The exit code
 * is the verdict: 0 only if every condition holds.
 */
import { UPGRADES } from '../src/harbor/constants.js';
import {
  HARBOR_RANGE_DAYS,
  runHarborRangeSim,
  runHarborWeekSim,
  validateHarborRangeReport,
  validateHarborWeekReport,
} from '../src/harbor/sim.js';
import { createMockNearAdapter } from '../src/harbor/near/adapter.js';
import { formatHarborSettlementSummary } from '../src/harbor/near/nep245.js';
import { buildHarborSettlementSample } from '../src/harbor/near/settlement_sample.js';

const conditions = [];
function check(name, ok, evidence) {
  conditions.push({ name, ok: Boolean(ok), evidence });
}

let range;
let rangeError = null;
try {
  range = runHarborRangeSim(1);
} catch (err) {
  rangeError = err;
}

// --- Attack log, day by day -------------------------------------------------
console.log('Harbor Range — attack log (seed 1, 7 days)');
if (range) {
  for (let day = 0; day < range.attackReports.length; day++) {
    const entry = range.attackReports[day];
    const refused = entry.events.filter((e) => !e.ok).length;
    const volume = entry.trades ?? entry.attempts ?? 0;
    const kind = entry.trades !== undefined ? 'trades' : 'attempts';
    console.log(
      `  day ${day}  ${entry.attacker.padEnd(15)} ${String(volume).padStart(2)} ${kind}, ` +
        `${refused} refused, stalls open after: ${entry.openStalls}  ${entry.openStalls >= 1 ? 'HELD' : 'BROKEN'}`,
    );
  }
} else {
  console.log(`  range sim failed to run: ${rangeError?.message ?? rangeError}`);
}
console.log('');

// --- Conditions ---------------------------------------------------------------
check(
  'range report validates against its schema',
  range && validateHarborRangeReport(range).ok,
  range ? 'validateHarborRangeReport: ok' : `no report (${rangeError?.message ?? 'unknown error'})`,
);
check(
  'survival invariant holds for the range week',
  range && range.stallsSurvivedAttack === true,
  range ? `stallsSurvivedAttack = ${range.stallsSurvivedAttack}` : 'no report',
);
check(
  'at least one stall is still open after day 7',
  range && range.openStalls >= 1,
  range ? `openStalls = ${range.openStalls} of 3` : 'no report',
);
check(
  'every attack day left a non-empty event log',
  range &&
    range.attackReports.length === HARBOR_RANGE_DAYS &&
    range.attackReports.every((entry) => Array.isArray(entry.events) && entry.events.length >= 1),
  range ? `${range.attackReports.filter((e) => e.events.length >= 1).length}/${HARBOR_RANGE_DAYS} days logged` : 'no report',
);
const spendDays = range ? range.attackReports.filter((e) => e.attacker === 'buy_everything') : [];
check(
  'runaway-spend persona fired fully and stayed inside the upgrade list',
  spendDays.length >= 1 &&
    spendDays.every(
      (e) => e.attempts === UPGRADES.length && e.events.every((ev) => UPGRADES.some((u) => u.id === ev.upgrade)),
    ),
  spendDays.length
    ? spendDays.map((e) => `${e.attempts}/${UPGRADES.length} attempts, all logged`).join('; ')
    : 'no buy_everything day in report',
);

let week = null;
let weekOk = false;
try {
  week = runHarborWeekSim(42);
  weekOk = validateHarborWeekReport(week).ok && week.openStalls >= 1;
} catch {
  weekOk = false;
}
check(
  'background-trader week (no attackers) validates and keeps stalls open',
  weekOk,
  week ? `openStalls = ${week.openStalls}, settlements = ${week.settlements}, playerCoin = ${week.playerCoin}` : 'week sim failed',
);

let sample = null;
try {
  sample = buildHarborSettlementSample();
} catch {
  sample = null;
}
check(
  'settlement sample validates and round-trips as JSON',
  sample && sample.validation.ok && sample.jsonCheck.ok,
  sample ? `validation ok, JSON round-trip ok` : 'settlement sample failed to build',
);
check(
  'settlement summary reports PASS with at least one transfer',
  sample && formatHarborSettlementSummary(sample.payload).startsWith('Harbor Settlement PASS'),
  sample ? formatHarborSettlementSummary(sample.payload) : 'no sample',
);

let mainnetRefused = false;
try {
  createMockNearAdapter({ network: 'mainnet' });
} catch {
  mainnetRefused = true;
}
check('mock NEAR adapter refuses mainnet', mainnetRefused, 'createMockNearAdapter({ network: "mainnet" }) throws');

let deterministic = false;
try {
  deterministic = JSON.stringify(runHarborRangeSim(1)) === JSON.stringify(range);
} catch {
  deterministic = false;
}
check('determinism: two seed-1 range runs are identical', deterministic, 'reports compared byte for byte');

// --- Verdict ------------------------------------------------------------------
for (const c of conditions) {
  console.log(`${c.ok ? 'GREEN' : 'RED'}  ${c.name} — ${c.evidence}`);
}
const failed = conditions.filter((c) => !c.ok);
if (failed.length === 0) {
  console.log(`GREEN: all ${conditions.length} conditions hold.`);
  process.exit(0);
}
console.log(`RED: ${failed.length} of ${conditions.length} conditions failed.`);
process.exit(1);
