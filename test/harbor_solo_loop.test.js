import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatHarborSoloLoopSummary,
  runHarborSoloLoopProof,
} from '../src/harbor/solo_loop.js';

test('runHarborSoloLoopProof completes dock sell buy and arms sonar for next duel', () => {
  const result = runHarborSoloLoopProof();
  assert.equal(result.ok, true, formatHarborSoloLoopSummary(result));
  assert.ok(result.sells >= 1);
  assert.ok(result.upgrades.includes('sonar'));
  assert.equal(result.buffs.sonar, true);
  const line = formatHarborSoloLoopSummary(result);
  assert.match(line, /^Harbor Solo Loop PASS /);
});
