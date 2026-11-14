import test from 'node:test';
import assert from 'node:assert/strict';
import { priceQuote } from '../src/harbor/pricing.js';
import { createHarborSession, harborSell, settleHarborBatch } from '../src/harbor/session.js';
import {
  formatHarborRangeSummary,
  formatHarborWeekSummary,
  normalizeHarborSimSeed,
  runHarborWeekSim,
  runHarborRangeSim,
  validateHarborAttackReportEntry,
  validateHarborRangeReport,
  validateHarborWeekReport,
} from '../src/harbor/sim.js';
import { formatHarborStatus } from '../src/harbor_bridge.js';
import {
  HARBOR_TOKEN_IDS,
  formatHarborSettlementSummary,
  ledgerToNep245Batch,
  parseHarborSettlementPayload,
  serializeHarborSettlementPayload,
  tokenIdForGood,
  validateHarborSettlementPayload,
} from '../src/harbor/near/nep245.js';
import { createMockNearAdapter } from '../src/harbor/near/adapter.js';
import { buildHarborSettlementSample } from '../src/harbor/near/settlement_sample.js';
import { runHarborJudgeDemo } from '../src/harbor/judge_demo.js';
import { salvageFromShots } from '../src/harbor/salvage.js';
import { newShots } from '../src/engine.js';

test('pricing returns a reason on every quote', () => {
  const q = priceQuote('iron', 2, 0.8);
  assert.ok(q.price >= 1);
  assert.match(q.reason, /stock|demand|tariff/i);
});

test('salvage counts hits from Grid Fleet shot maps', () => {
  const shots = newShots();
  shots.set('1,1', 'hit');
  shots.set('2,2', 'sunk');
  const salvage = salvageFromShots(shots);
  assert.ok(salvage.iron >= 3);
});

test('harbor sell enqueues settlement on mock testnet adapter', () => {
  const session = createHarborSession();
  session.player.salvage.iron = 5;
  const adapter = createMockNearAdapter();
  const trade = harborSell(session, 'ironmonger', 'iron', 2);
  assert.equal(trade.ok, true);
  const receipts = settleHarborBatch(session, adapter);
  assert.equal(receipts.length, 1);
  assert.match(receipts[0].explorer, /testnet\.nearblocks\.io/);
  assert.equal(session.pendingLedger.length, 0);
});

test('fast-forward sim completes a week without closing every stall', () => {
  const summary = runHarborWeekSim(42);
  assert.equal(summary.days, 7);
  assert.ok(summary.playerCoin > 0);
  assert.ok(summary.settlements > 0);
  assert.ok(summary.openStalls >= 1);
});

test('mock adapter rejects mainnet', () => {
  assert.throws(() => createMockNearAdapter({ network: 'mainnet' }), /testnet-only/);
});

test('Harbor Range sim keeps at least one stall open after attacker week', () => {
  const report = runHarborRangeSim(7);
  assert.equal(report.days, 7);
  assert.equal(report.attackReports.length, 7);
  assert.ok(report.stallsSurvivedAttack);
  assert.ok(report.settlements > 0);
  const validation = validateHarborRangeReport(report);
  assert.equal(validation.ok, true, validation.errors?.join('; '));
});

test('Harbor Range sim is deterministic for a fixed seed', () => {
  const a = runHarborRangeSim(99);
  const b = runHarborRangeSim(99);
  assert.equal(a.playerCoin, b.playerCoin);
  assert.equal(a.settlements, b.settlements);
  assert.equal(a.openStalls, b.openStalls);
});

test('Harbor Range seed 1 matches judge DEMO golden summary', () => {
  const report = runHarborRangeSim(1);
  assert.equal(report.seed, 1);
  assert.equal(report.playerCoin, 1008);
  assert.equal(report.settlements, 2);
  assert.equal(report.openStalls, 1);
  assert.equal(report.stallsSurvivedAttack, true);
});

test('validateHarborAttackReportEntry rejects empty events', () => {
  const check = validateHarborAttackReportEntry(
    { attacker: 'iron_flooder', trades: 2, openStalls: 2, events: [] },
    0,
  );
  assert.equal(check.ok, false);
  assert.match(check.errors.join(' '), /events/);
});

test('validateHarborRangeReport rejects malformed attackReports', () => {
  const base = runHarborRangeSim(1);
  const broken = {
    ...base,
    attackReports: base.attackReports.map((entry, day) =>
      day === 2 ? { ...entry, attempts: 0 } : entry,
    ),
  };
  const check = validateHarborRangeReport(broken);
  assert.equal(check.ok, false);
  assert.match(check.errors.join(' '), /buy_everything|attempts/);
});

test('formatHarborRangeSummary marks PASS when stalls survive', () => {
  const report = runHarborRangeSim(1);
  const line = formatHarborRangeSummary(report);
  assert.match(line, /^Harbor Range PASS seed=1 /);
});

test('formatHarborStatus mentions mock settlement when receipts exist', () => {
  const session = createHarborSession();
  session.player.salvage.iron = 4;
  const adapter = createMockNearAdapter();
  harborSell(session, 'ironmonger', 'iron', 2);
  const receipts = settleHarborBatch(session, adapter);
  const line = formatHarborStatus({
    docked: { salvage: { ...session.player.salvage }, coin: session.player.coin },
    receipts,
  });
  assert.match(line, /Mock testnet settled 1 batch/);
});

test('normalizeHarborSimSeed coerces invalid input to default', () => {
  assert.equal(normalizeHarborSimSeed('not-a-number'), 1);
  assert.equal(normalizeHarborSimSeed(-5), 4294967291);
});

test('ledger maps sells to NEP-245 token ids', () => {
  assert.equal(tokenIdForGood('iron'), 'harbor-iron');
  const batch = ledgerToNep245Batch([
    { kind: 'sell', shipwright: 'ironmonger.harbor.testnet', goodId: 'iron', units: 2, coin: 8 },
  ]);
  assert.equal(batch[0].token_id, 'harbor-iron');
  assert.equal(batch[0].amount, '2');
});

test('settlement flush attaches nep245 batch on adapter', () => {
  const session = createHarborSession();
  session.player.salvage.iron = 3;
  const adapter = createMockNearAdapter();
  harborSell(session, 'ironmonger', 'iron', 1);
  settleHarborBatch(session, adapter);
  assert.ok(Array.isArray(adapter.lastNep245Batch));
  assert.equal(adapter.lastNep245Batch.length, 1);
  const payload = JSON.parse(adapter.lastSettlementPayload);
  assert.equal(payload.version, 1);
  assert.equal(payload.transfers[0].token_id, HARBOR_TOKEN_IDS.iron);
});

test('serializeHarborSettlementPayload matches contract JSON shape', () => {
  const raw = serializeHarborSettlementPayload([
    { kind: 'upgrade', shipwright: 'ironmonger.harbor.testnet', upgrade: 'hull', coin: 5 },
  ]);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.transfers[0].token_id, HARBOR_TOKEN_IDS.coin);
  assert.equal(parsed.transfers[0].memo, 'upgrade:hull');
});

test('validateHarborSettlementPayload rejects malformed batches', () => {
  const bad = validateHarborSettlementPayload({ version: 2, transfers: [] });
  assert.equal(bad.ok, false);
  const emptyMemo = validateHarborSettlementPayload({
    version: 1,
    transfers: [
      {
        type: 'ft_transfer',
        from: 'ironmonger.harbor.testnet',
        token_id: HARBOR_TOKEN_IDS.iron,
        amount: '2',
        memo: '',
      },
    ],
  });
  assert.equal(emptyMemo.ok, false);
  const sample = buildHarborSettlementSample();
  assert.equal(sample.validation.ok, true);
  assert.match(formatHarborSettlementSummary(sample.payload), /^Harbor Settlement PASS /);
});

test('formatHarborWeekSummary marks PASS when stalls stay open', () => {
  const summary = runHarborWeekSim(42);
  const line = formatHarborWeekSummary(summary);
  assert.match(line, /^Harbor Week PASS /);
});

test('validateHarborWeekReport accepts a week sim summary', () => {
  const summary = runHarborWeekSim(7);
  const check = validateHarborWeekReport(summary);
  assert.equal(check.ok, true);
});

test('validateHarborWeekReport rejects empty settlements', () => {
  const check = validateHarborWeekReport({
    days: 7,
    playerCoin: 0,
    settlements: 0,
    openStalls: 1,
  });
  assert.equal(check.ok, false);
  assert.match(check.errors.join(' '), /settlements/);
});

test('validateHarborRangeReport rejects when stalls did not survive attack week', () => {
  const check = validateHarborRangeReport({
    days: 7,
    playerCoin: 100,
    settlements: 2,
    openStalls: 0,
    stallsSurvivedAttack: false,
    attackReports: [],
  });
  assert.equal(check.ok, false);
  assert.match(check.errors.join(' '), /stallsSurvivedAttack/);
});

test('runHarborJudgeDemo passes fixed seeds for judge dry-run', () => {
  const demo = runHarborJudgeDemo();
  assert.equal(demo.ok, true);
  assert.match(demo.summary, /^Harbor Judge Demo PASS range=1 week=42 /);
  assert.equal(demo.lines.length, 3);
  assert.match(demo.lines[0], /^Harbor Range PASS /);
  assert.match(demo.lines[1], /^Harbor Week PASS /);
  assert.match(demo.lines[2], /^Harbor Settlement PASS /);
});

test('buildHarborSettlementSample yields valid NEP-245 JSON', () => {
  const sample = buildHarborSettlementSample();
  assert.equal(sample.validation.ok, true);
  assert.equal(sample.jsonCheck.ok, true);
  assert.equal(sample.payload.version, 1);
  assert.ok(sample.payload.transfers.length >= 1);
});

test('validateHarborSettlementPayload rejects zero amounts', () => {
  const check = validateHarborSettlementPayload({
    version: 1,
    transfers: [{ type: 'ft_transfer', from: 'x', token_id: 'harbor-iron', amount: '0' }],
  });
  assert.equal(check.ok, false);
});
