#!/usr/bin/env node
import { runHarborJudgeDemo } from '../src/harbor/judge_demo.js';

const quiet = process.argv.includes('--quiet');
let result;
try {
  result = runHarborJudgeDemo();
} catch (err) {
  console.error(String(err?.message ?? err));
  process.exit(1);
}

if (!quiet) {
  console.log(
    JSON.stringify(
      {
        range: result.range,
        week: result.week,
        settlement: result.settlement,
      },
      null,
      2,
    ),
  );
}

for (const line of result.lines) {
  console.error(line);
}
console.error(result.summary);
process.exit(result.ok ? 0 : 1);
