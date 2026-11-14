#!/usr/bin/env node
import {
  formatHarborSoloLoopSummary,
  runHarborSoloLoopProof,
} from '../src/harbor/solo_loop.js';

let result;
try {
  result = runHarborSoloLoopProof();
} catch (err) {
  console.error(String(err?.message ?? err));
  process.exit(1);
}

const line = formatHarborSoloLoopSummary(result);
console.log(JSON.stringify(result, null, 2));
console.error(line);
if (!result.ok) {
  process.exit(1);
}
