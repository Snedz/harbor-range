import {
  formatHarborRangeSummary,
  formatHarborWeekSummary,
  runHarborRangeSim,
  runHarborWeekSim,
  validateHarborRangeReport,
  validateHarborWeekReport,
} from './sim.js';
import { formatHarborSettlementSummary } from './near/nep245.js';
import { buildHarborSettlementSample } from './near/settlement_sample.js';

/** Fixed seeds for reproducible judge / CI dry-runs (see DEMO.md). */
export const JUDGE_DEMO_RANGE_SEED = 1;
export const JUDGE_DEMO_WEEK_SEED = 42;

/**
 * Runs Harbor Range, week sim, and NEP-245 settlement sample in-process.
 * Returns PASS/FAIL summary for stderr-friendly CI and demo filming.
 */
export function runHarborJudgeDemo(options = {}) {
  const rangeSeed = options.rangeSeed ?? JUDGE_DEMO_RANGE_SEED;
  const weekSeed = options.weekSeed ?? JUDGE_DEMO_WEEK_SEED;
  const lines = [];
  let ok = true;

  const range = runHarborRangeSim(rangeSeed);
  const rangeValidation = validateHarborRangeReport(range);
  lines.push(formatHarborRangeSummary({ ...range, seed: rangeSeed }));
  if (!rangeValidation.ok) ok = false;

  const week = { ...runHarborWeekSim(weekSeed), seed: weekSeed };
  const weekValidation = validateHarborWeekReport(week);
  lines.push(formatHarborWeekSummary(week));
  if (!weekValidation.ok) ok = false;

  const sample = buildHarborSettlementSample();
  lines.push(formatHarborSettlementSummary(sample.payload));
  if (!sample.validation.ok || !sample.jsonCheck.ok) ok = false;

  const transferCount = sample.payload?.transfers?.length ?? 0;
  const summary = ok
    ? `Harbor Judge Demo PASS range=${rangeSeed} week=${weekSeed} transfers=${transferCount}`
    : 'Harbor Judge Demo FAIL';

  return {
    ok,
    rangeSeed,
    weekSeed,
    range,
    week,
    settlement: sample.payload,
    lines,
    summary,
  };
}
