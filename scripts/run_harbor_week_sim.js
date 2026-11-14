#!/usr/bin/env node
import {
  formatHarborWeekSummary,
  normalizeHarborSimSeed,
  runHarborWeekSim,
  validateHarborWeekReport,
} from '../src/harbor/sim.js';

const seed = normalizeHarborSimSeed(process.argv[2] ?? 1);
let report;
try {
  report = { ...runHarborWeekSim(seed), seed };
} catch (err) {
  console.error(String(err?.message ?? err));
  process.exit(1);
}

const validation = validateHarborWeekReport(report);
console.log(JSON.stringify(report, null, 2));
console.error(formatHarborWeekSummary(report));
if (!validation.ok) {
  console.error(validation.errors.join('\n'));
  process.exit(1);
}
