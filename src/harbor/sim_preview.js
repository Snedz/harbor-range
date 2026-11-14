import {
  formatHarborRangeSummary,
  formatHarborWeekSummary,
  normalizeHarborSimSeed,
  runHarborRangeSim,
  runHarborWeekSim,
} from './index.js';

/** UI-ready fast-forward sim lines (chain-free, mock NEAR inside sim). */
export function harborSimPreviewLines(seed) {
  const normalized = normalizeHarborSimSeed(seed);
  const week = runHarborWeekSim(normalized);
  const range = runHarborRangeSim(normalized);
  return {
    seed: normalized,
    week,
    range,
    weekLine: formatHarborWeekSummary(week),
    rangeLine: formatHarborRangeSummary({ ...range, seed: normalized }),
  };
}
