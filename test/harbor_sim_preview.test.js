import test from 'node:test';
import assert from 'node:assert/strict';
import { harborSimPreviewLines } from '../src/harbor/sim_preview.js';

test('harborSimPreviewLines returns PASS lines for week and range', () => {
  const preview = harborSimPreviewLines(42);
  assert.equal(preview.seed, 42);
  assert.match(preview.weekLine, /^Harbor Week PASS /);
  assert.match(preview.rangeLine, /^Harbor Range PASS /);
  assert.equal(preview.week.openStalls >= 1, true);
  assert.equal(preview.range.stallsSurvivedAttack, true);
});

test('harborSimPreviewLines normalizes invalid seeds', () => {
  const preview = harborSimPreviewLines('not-a-number');
  assert.equal(preview.seed, 1);
  assert.match(preview.weekLine, /^Harbor Week PASS /);
});
