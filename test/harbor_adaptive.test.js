import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADAPTIVE_ATTACKER_ID,
  formatHarborAdaptiveSummary,
  probeHarborQuotes,
  runHarborAdaptiveCheck,
  validateAdaptiveReport,
} from '../src/harbor/adaptive.js';
import { createHarborSession } from '../src/harbor/session.js';

test('probeHarborQuotes ranks every published pair by payout', () => {
  const session = createHarborSession();
  const probes = probeHarborQuotes(session);
  assert.equal(probes.length, 7);
  for (let i = 1; i < probes.length; i++) {
    assert.ok(probes[i - 1].unitPayout >= probes[i].unitPayout);
  }
  assert.equal(probes[0].unitPayout, 4);
});

test('adaptive raider holds the survival invariant and validates', () => {
  const report = runHarborAdaptiveCheck();
  assert.equal(report.attacker, ADAPTIVE_ATTACKER_ID);
  assert.equal(report.invariantHeld, true);
  assert.deepEqual(report.violations, []);
  assert.ok(report.stallsSurvivedAttack);
  assert.ok(report.openStalls >= 1);
  assert.ok(validateAdaptiveReport(report).ok);
});

test('adaptive raider concentrates sequentially and adapts lot sizes', () => {
  const report = runHarborAdaptiveCheck();
  assert.equal(report.sequentialCommitment, true);
  assert.ok(report.retargets >= 1);
  assert.ok(report.overshoots >= 1);
  assert.ok(new Set(report.lotSizes).size >= 2, 'lot sizes must vary with observations');
  // The one coin the raider cannot extract is the coin a refusal protects:
  // total extraction stays strictly below the 24-coin opening reserve
  // whenever a reserve refusal fired.
  if (report.refused >= 1) assert.ok(report.extractedCoin < 24);
});

test('adaptive run is deterministic', () => {
  const a = runHarborAdaptiveCheck();
  const b = runHarborAdaptiveCheck();
  assert.equal(JSON.stringify(a.events), JSON.stringify(b.events));
  assert.equal(a.extractedCoin, b.extractedCoin);
});

test('formatHarborAdaptiveSummary prints PASS for the recorded run', () => {
  const report = runHarborAdaptiveCheck();
  assert.ok(formatHarborAdaptiveSummary(report).startsWith('Harbor Adaptive PASS'));
  assert.equal(formatHarborAdaptiveSummary(null), 'Harbor Adaptive FAIL invalid report');
});
