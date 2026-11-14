#!/usr/bin/env node
import {
  formatHarborRangeSummary,
  normalizeHarborSimSeed,
  runHarborRangeSim,
  validateHarborRangeReport,
} from '../src/harbor/sim.js';

const seed = normalizeHarborSimSeed(process.argv[2] ?? 1);
let report;
try {
  report = runHarborRangeSim(seed);
} catch (err) {
  console.error(String(err?.message ?? err));
  process.exitCode = 1;
  process.exit(1);
}

const validation = validateHarborRangeReport(report);
console.log(JSON.stringify(report, null, 2));
console.error(formatHarborRangeSummary(report));
if (!validation.ok) {
  console.error(validation.errors.join('\n'));
  process.exit(1);
}
