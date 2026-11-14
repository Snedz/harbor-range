#!/usr/bin/env node
/**
 * Harbor Range seed sweep — the survival invariant across fixed seeds.
 *
 * Runs the full range week (attackers + background traders + settlement)
 * once per seed for seeds 1..100 and asserts, for every seed, that the
 * report validates and the survival invariant holds (stallsSurvivedAttack
 * true, at least one stall open). Fixed seed set, no randomness in the
 * sweep itself: the same command reproduces the same table on any clone.
 * Any seed that fails is printed as a counterexample and the exit code
 * is 1.
 */
import { runHarborRangeSim, validateHarborRangeReport } from '../src/harbor/sim.js';

const SEED_COUNT = 100;
const held = [];
const failed = [];
const openDistribution = new Map();
let minOpenStalls = Infinity;
let totalSettlements = 0;

for (let seed = 1; seed <= SEED_COUNT; seed++) {
  try {
    const report = runHarborRangeSim(seed);
    const validation = validateHarborRangeReport(report);
    if (validation.ok && report.stallsSurvivedAttack === true && report.openStalls >= 1) {
      held.push(seed);
      minOpenStalls = Math.min(minOpenStalls, report.openStalls);
      openDistribution.set(report.openStalls, (openDistribution.get(report.openStalls) ?? 0) + 1);
      totalSettlements += report.settlements;
    } else {
      failed.push({ seed, reason: validation.ok ? 'invariant false' : validation.errors.join('; ') });
    }
  } catch (err) {
    failed.push({ seed, reason: String(err?.message ?? err) });
  }
}

console.log(`Harbor Seed Sweep — range week, seeds 1..${SEED_COUNT}`);
for (const [open, count] of [...openDistribution.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  openStalls = ${open}: ${count} seeds`);
}
console.log(`  settlements across held seeds: ${totalSettlements}`);
if (failed.length > 0) {
  for (const f of failed) console.log(`  counterexample seed ${f.seed}: ${f.reason}`);
  console.log(`Harbor Seed Sweep FAIL held=${held.length}/${SEED_COUNT} seeds`);
  process.exit(1);
}
console.log(
  `Harbor Seed Sweep PASS held=${held.length}/${SEED_COUNT} seeds=1..${SEED_COUNT} minOpenStalls=${minOpenStalls}`,
);
process.exit(0);
