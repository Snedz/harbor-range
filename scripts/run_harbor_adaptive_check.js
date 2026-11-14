#!/usr/bin/env node
/**
 * Harbor Range adaptive check — one adaptive scenario, separate from the week.
 *
 * A single attacker persona that probes published quotes, concentrates on
 * the pair that drains fastest, and sizes lots from its own reserve model
 * (with a deliberate overshoot every fifth trade). Asserts the survival
 * invariant per trade: no payout beyond the stall's reserve, no refusal
 * ever moves coin, at least one stall still open at the end.
 */
import {
  formatHarborAdaptiveSummary,
  runHarborAdaptiveCheck,
} from '../src/harbor/adaptive.js';

let report;
try {
  report = runHarborAdaptiveCheck();
} catch (err) {
  console.error(String(err?.message ?? err));
  console.error('Harbor Adaptive FAIL');
  process.exit(1);
}

console.log('Harbor Adaptive — probe (published sell quotes, best first)');
for (const p of report.probes) {
  console.log(`  ${p.shipwright.padEnd(12)} ${p.good.padEnd(7)} payout ${p.unitPayout}/unit`);
}
console.log('');
console.log('Harbor Adaptive — attack log (lot sized from the raider reserve model)');
for (const e of report.events.filter((ev) => ev.kind === 'trade')) {
  console.log(
    `  trade ${String(e.n).padStart(2)}  ${e.shipwright.padEnd(12)} ${e.good.padEnd(7)} lot ${String(e.lot).padStart(2)}` +
      `${e.overshoot ? ' (overshoot)' : ''}  ${e.ok ? `accepted, payout ${e.payout}` : `refused: ${e.error}`}  stalls open: ${e.openStalls}`,
  );
}
console.log('');
console.log(
  `adaptation: ${report.retargets} retargets (probe rank order, one stall at a time, none revisited), ` +
    `${report.overshoots} deliberate overshoots, extracted ${report.extractedCoin} coin against 24 of opening reserve`,
);
console.error(formatHarborAdaptiveSummary(report));
process.exit(report.invariantHeld && report.stallsSurvivedAttack ? 0 : 1);
