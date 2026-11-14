import test from 'node:test';
import assert from 'node:assert/strict';
import { newShots } from '../src/engine.js';
import {
  formatHarborStatus,
  getActiveHarborUpgrades,
  getHarborSummary,
  harborSimPreviewLines,
  onLocalMatchEnd,
  quickSellIron,
  resetHarborSession,
  tryHarborBuyUpgrade,
} from '../src/harbor_bridge.js';

test('onLocalMatchEnd docks salvage and quickSellIron settles mock batches', () => {
  resetHarborSession();
  const shots = newShots();
  shots.set('1,1', 'hit');
  shots.set('2,2', 'sunk');
  const summary = onLocalMatchEnd({ foe: { shots } });
  assert.ok(summary);
  assert.ok(summary.docked.salvage.iron >= 1);
  assert.match(formatHarborStatus(summary), /Docked at harbor/);
  const sell = quickSellIron(1);
  assert.equal(sell.ok, true);
  assert.ok(getHarborSummary().coin > 0, 'iron sale should credit harbor coin');
});

test('tryHarborBuyUpgrade rejects sonar until the player earns harbor coin', () => {
  resetHarborSession();
  assert.equal(tryHarborBuyUpgrade('ironmonger', 'sonar').ok, false);
  assert.deepEqual(getActiveHarborUpgrades(), []);
  const shots = newShots();
  shots.set('0,0', 'hit');
  shots.set('1,1', 'sunk');
  onLocalMatchEnd({ foe: { shots } });
  assert.equal(quickSellIron(1).ok, true);
  assert.ok(getHarborSummary().coin > 0);
  assert.equal(tryHarborBuyUpgrade('ironmonger', 'sonar').ok, false);
});

test('onLocalMatchEnd ignores boards without foe shots', () => {
  resetHarborSession();
  assert.equal(onLocalMatchEnd(null), null);
  assert.equal(onLocalMatchEnd({ foe: {} }), null);
});

test('harbor_bridge re-exports harborSimPreviewLines for in-browser fast-forward', () => {
  const preview = harborSimPreviewLines(7);
  assert.match(preview.weekLine, /^Harbor Week PASS /);
  assert.match(preview.rangeLine, /^Harbor Range PASS /);
});
