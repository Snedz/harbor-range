import { fire } from '../engine.js';

const CARRIER_LEN = 5;

function shipAt(board, x, y) {
  for (let i = 0; i < board.ships.length; i++) {
    const ship = board.ships[i];
    for (let c = 0; c < ship.cells.length; c++) {
      if (ship.cells[c][0] === x && ship.cells[c][1] === y) return ship;
    }
  }
  return null;
}

/** Harbor upgrades that affect the next solo duel (chain-free). */
export function buildHarborBattleBuffs(upgrades) {
  const owned = new Set(Array.isArray(upgrades) ? upgrades : []);
  return {
    sonar: owned.has('sonar'),
    armorPlate: owned.has('armor'),
    skiffDecoy: owned.has('skiff'),
    armorConsumed: false,
  };
}

/** Pick one hidden enemy ship cell for the sonar ping (battle start). */
export function pickSonarReveal(enemyBoard, rng) {
  const roll = typeof rng === 'function' ? rng : Math.random;
  const hidden = [];
  for (let s = 0; s < enemyBoard.ships.length; s++) {
    const ship = enemyBoard.ships[s];
    for (let c = 0; c < ship.cells.length; c++) {
      const x = ship.cells[c][0];
      const y = ship.cells[c][1];
      const key = x + ',' + y;
      if (!enemyBoard.shots.has(key)) hidden.push([x, y]);
    }
  }
  if (!hidden.length) return null;
  return hidden[Math.floor(roll() * hidden.length)];
}

/**
 * Fire on the player's board with harbour armour: first hit on the carrier is a miss.
 * Mutates `buffs.armorConsumed` when the plate triggers.
 */
export function fireWithHarborArmor(board, x, y, buffs) {
  const key = x + ',' + y;
  if (board.shots.has(key)) {
    return { outcome: fire(board, x, y), armorTriggered: false };
  }
  const targetShip = shipAt(board, x, y);
  const outcome = fire(board, x, y);
  if (
    buffs &&
    buffs.armorPlate &&
    !buffs.armorConsumed &&
    targetShip &&
    targetShip.len === CARRIER_LEN &&
    (outcome.result === 'hit' || outcome.result === 'sunk')
  ) {
    targetShip.hits -= 1;
    board.shots.set(key, 'miss');
    buffs.armorConsumed = true;
    return { outcome: { result: 'miss' }, armorTriggered: true };
  }
  return { outcome, armorTriggered: false };
}

export function harborBattleStartNotes(buffs) {
  const notes = [];
  if (buffs?.sonar) notes.push('Sonar pinged a hidden cell.');
  if (buffs?.skiffDecoy) notes.push('Spare skiff decoy armed (cosmetic).');
  return notes;
}
