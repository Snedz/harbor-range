#!/usr/bin/env node
import { buildHarborSettlementSample } from '../src/harbor/near/settlement_sample.js';
import { formatHarborSettlementSummary } from '../src/harbor/near/nep245.js';

let sample;
try {
  sample = buildHarborSettlementSample();
} catch (err) {
  console.error(String(err?.message ?? err));
  process.exit(1);
}

console.log(JSON.stringify(sample.payload, null, 2));
console.error(formatHarborSettlementSummary(sample.payload));
if (!sample.validation.ok) {
  console.error(sample.validation.errors.join('\n'));
  process.exit(1);
}
if (!sample.jsonCheck.ok) {
  console.error(sample.jsonCheck.errors.join('\n'));
  process.exit(1);
}
