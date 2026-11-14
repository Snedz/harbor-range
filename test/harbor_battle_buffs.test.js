import test from 'node:test';
import assert from 'node:assert/strict';
import { FLEET, newBoard, place, fire } from '../src/engine.js';
import {
  buildHarborBattleBuffs,
  fireWithHarborArmor,
  pickSonarReveal,
} from '../src/harbor/battle_buffs.js';
import { createHarborSession, harborBuyUpgrade } from '../src/harbor/session.js';

test('buildHarborBattleBuffs maps upgrade ids to battle flags', () => {
  const buffs = buildHarborBattleBuffs(['sonar', 'armor']);
  assert.equal(buffs.sonar, true);
  assert.equal(buffs.armorPlate, true);
  assert.equal(buffs.skiffDecoy, false);
  assert.equal(buffs.armorConsumed, false);
});

test('pickSonarReveal returns a hidden ship cell', () => {
  const foe = newBoard();
  place(foe, FLEET[4], 0, 0, true);
  const cell = pickSonarReveal(foe, () => 0);
  assert.deepEqual(cell, [0, 0]);
});

test('fireWithHarborArmor turns the first carrier hit into a miss', () => {
  const board = newBoard();
  place(board, FLEET[0], 0, 0, true);
  const buffs = buildHarborBattleBuffs(['armor']);
  const first = fireWithHarborArmor(board, 0, 0, buffs);
  assert.equal(first.outcome.result, 'miss');
  assert.equal(first.armorTriggered, true);
  assert.equal(buffs.armorConsumed, true);
  const second = fireWithHarborArmor(board, 1, 0, buffs);
  assert.equal(second.outcome.result, 'hit');
});

test('tryHarborBuyUpgrade exposes upgrades for the next duel', () => {
  const session = createHarborSession();
  session.player.coin = 50;
  const bought = harborBuyUpgrade(session, 'ironmonger', 'sonar');
  assert.equal(bought.ok, true);
  assert.deepEqual(session.player.upgrades, ['sonar']);
});

test('fire baseline still works without harbor buffs', () => {
  const board = newBoard();
  place(board, FLEET[4], 0, 0, true);
  assert.equal(fire(board, 0, 0).result, 'hit');
});
