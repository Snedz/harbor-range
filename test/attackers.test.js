import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTACKER_IDS,
  createAttackerBot,
  runBuyEverything,
  runHarborRangeDay,
  runIronFlooder,
  runWashTrader,
} from '../src/harbor/attackers.js';
import { createHarborSession } from '../src/harbor/session.js';
import { UPGRADES } from '../src/harbor/constants.js';

test('createAttackerBot seeds inventory per persona', () => {
  assert.ok(createAttackerBot('iron_flooder').salvage.iron >= 100);
  assert.ok(createAttackerBot('wash_trader').salvage.timber >= 50);
  assert.equal(createAttackerBot('buy_everything').coin, 500);
  assert.throws(() => createAttackerBot('unknown'), /unknown attacker/);
});

test('runHarborRangeDay rotates attackers across the week', () => {
  const session = createHarborSession();
  for (let day = 0; day < ATTACKER_IDS.length; day++) {
    const report = runHarborRangeDay(session, day);
    assert.equal(report.attacker, ATTACKER_IDS[day]);
    assert.ok(report.openStalls >= 0);
  }
});

test('iron flooder performs trades without crashing the session', () => {
  const session = createHarborSession();
  const bot = createAttackerBot('iron_flooder');
  const report = runIronFlooder(session, bot);
  assert.equal(report.attacker, 'iron_flooder');
  assert.ok(report.trades >= 1);
});

test('wash trader cycles timber and canvas sells', () => {
  const session = createHarborSession();
  const bot = createAttackerBot('wash_trader');
  const report = runWashTrader(session, bot);
  assert.equal(report.attacker, 'wash_trader');
  assert.ok(report.trades >= 1);
});

test('buy everything attempts each upgrade once', () => {
  const session = createHarborSession();
  const bot = createAttackerBot('buy_everything');
  const report = runBuyEverything(session, bot);
  assert.equal(report.attacker, 'buy_everything');
  assert.equal(report.attempts, UPGRADES.length);
  assert.equal(report.events.length, UPGRADES.length);
});
