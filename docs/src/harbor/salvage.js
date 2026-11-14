/** Map duel outcomes to harbor salvage (chain-free). */

const HIT_DROP = Object.freeze({ iron: 1, timber: 0, canvas: 1 });
const SUNK_BONUS = Object.freeze({ iron: 2, timber: 2, canvas: 1 });

export function emptySalvage() {
  return { iron: 0, timber: 0, canvas: 0 };
}

function eachShot(shots, fn) {
  if (!shots) return;
  if (typeof shots.keys === 'function') {
    const keys = shots.keys();
    for (let i = 0; i < keys.length; i++) fn(keys[i], shots.get(keys[i]));
    return;
  }
  for (const key in shots) {
    if (Object.prototype.hasOwnProperty.call(shots, key)) fn(key, shots[key]);
  }
}

export function salvageFromShots(shots) {
  const out = emptySalvage();
  let hits = 0;
  let sinks = 0;
  eachShot(shots, (_key, result) => {
    if (result === 'hit') hits += 1;
    if (result === 'sunk') sinks += 1;
  });
  out.iron += hits * HIT_DROP.iron + sinks * SUNK_BONUS.iron;
  out.timber += hits * HIT_DROP.timber + sinks * SUNK_BONUS.timber;
  out.canvas += hits * HIT_DROP.canvas + sinks * SUNK_BONUS.canvas;
  return out;
}

export function mergeSalvage(player, gained) {
  for (const key of ['iron', 'timber', 'canvas']) {
    player.salvage[key] = (player.salvage[key] ?? 0) + (gained[key] ?? 0);
  }
}
