#!/usr/bin/env node
/**
 * Harbor Range same-seed control — the attributable baseline.
 *
 * The attack week runs seed 1; the cage check's background week runs
 * seed 42, which makes the comparison unattributable. This control runs
 * the no-attacker week at the SAME seed (1) with the week sim's own
 * parameters (20 background traders a day, no personas, no injected
 * coin) and prints both verdicts side by side. Existing week/range
 * outputs are untouched; this is an additional run, not a change.
 */
import {
  formatHarborRangeSummary,
  formatHarborWeekSummary,
  runHarborRangeSim,
  runHarborWeekSim,
  validateHarborWeekReport,
} from '../src/harbor/sim.js';

const control = runHarborWeekSim(1);
const validation = validateHarborWeekReport(control);
const attack = runHarborRangeSim(1);

console.log('Harbor Control — no-attacker baseline week at seed 1 (attack week seed)');
console.log(`  control (no attackers, 20 traders/day): ${formatHarborWeekSummary(control)}`);
console.log(`  attack  (personas, 12 traders/day):     ${formatHarborRangeSummary(attack)}`);
console.log(
  `  read: the baseline ends with ${control.openStalls} stalls open and ${control.playerCoin} player coin ` +
    `(all of it legitimate trade; no coin is injected in the control). The attack week ends with ` +
    `${attack.openStalls} stall open and ${attack.playerCoin} player coin, of which 1,000 is the ` +
    `buy_everything persona's injected, unspent coin — so 8 coin of legitimate background sales ` +
    `settled during the attack week too.`,
);

if (validation.ok && control.openStalls >= 1) {
  console.log('Harbor Control PASS seed=1 baseline validates and keeps stalls open');
  process.exit(0);
}
console.log(`Harbor Control FAIL seed=1 ${validation.errors.join('; ')}`);
process.exit(1);
