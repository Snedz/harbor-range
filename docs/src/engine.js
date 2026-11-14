// Grid Fleet engine: pure logic, no DOM. Original game by Mission Winning.
// Runtime surface stays ES5-friendly (no Map, no Array.from) so the Nakama
// bundle can run these rules inside goja after a syntax downlevel.
export const SIZE = 10;
export const FLEET = [
  { id: 'carrier', name: 'Harbor Queen', len: 5 },
  { id: 'cruiser', name: 'Iron Gull', len: 4 },
  { id: 'frigate', name: 'Saltrunner', len: 3 },
  { id: 'sub', name: 'Quiet Eel', len: 3 },
  { id: 'patrol', name: 'Skiff', len: 2 },
];

export function cellsFor(x, y, len, horizontal) {
  const cells = [];
  for (let i = 0; i < len; i++) cells.push(horizontal ? [x + i, y] : [x, y + i]);
  return cells;
}

export function newShots() {
  const data = Object.create(null);
  return {
    has(key) { return Object.prototype.hasOwnProperty.call(data, key); },
    get(key) { return data[key]; },
    set(key, value) { data[key] = value; return this; },
    keys() {
      const out = [];
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) out.push(key);
      }
      return out;
    },
  };
}

export function newBoard() { return { ships: [], shots: newShots() }; }

export function canPlace(board, x, y, len, horizontal) {
  const cells = cellsFor(x, y, len, horizontal);
  for (let i = 0; i < cells.length; i++) {
    const cx = cells[i][0];
    const cy = cells[i][1];
    if (cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE) return false;
    for (let s = 0; s < board.ships.length; s++) {
      const occupied = board.ships[s].cells;
      for (let c = 0; c < occupied.length; c++) {
        if (occupied[c][0] === cx && occupied[c][1] === cy) return false;
      }
    }
  }
  return true;
}

export function place(board, ship, x, y, horizontal) {
  if (!canPlace(board, x, y, ship.len, horizontal)) return false;
  const placed = { id: ship.id, name: ship.name, len: ship.len, cells: cellsFor(x, y, ship.len, horizontal), hits: 0 };
  board.ships.push(placed);
  return true;
}

export function randomFleet(rng) {
  const roll = rng || Math.random;
  const board = newBoard();
  for (let i = 0; i < FLEET.length; i++) {
    const ship = FLEET[i];
    let ok = false;
    while (!ok) ok = place(board, ship, Math.floor(roll() * SIZE), Math.floor(roll() * SIZE), roll() < 0.5);
  }
  return board;
}

function shipAt(board, x, y) {
  for (let i = 0; i < board.ships.length; i++) {
    const ship = board.ships[i];
    for (let c = 0; c < ship.cells.length; c++) {
      if (ship.cells[c][0] === x && ship.cells[c][1] === y) return ship;
    }
  }
  return null;
}

// Returns 'miss' | 'hit' | 'sunk' | 'repeat' | 'invalid'
export function fire(board, x, y) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return { result: 'invalid' };
  const key = x + ',' + y;
  if (board.shots.has(key)) return { result: 'repeat' };
  const ship = shipAt(board, x, y);
  if (!ship) {
    board.shots.set(key, 'miss');
    return { result: 'miss' };
  }
  ship.hits++;
  board.shots.set(key, 'hit');
  return ship.hits === ship.len ? { result: 'sunk', ship: ship.name } : { result: 'hit' };
}

export function allSunk(board) {
  if (!board.ships.length) return false;
  for (let i = 0; i < board.ships.length; i++) {
    if (board.ships[i].hits !== board.ships[i].len) return false;
  }
  return true;
}

// Hunt/target AI: random parity hunting, then probes neighbors of unresolved hits.
export function createAI(rng) {
  const roll = rng || Math.random;
  const targets = [];
  return {
    pick(board) {
      while (targets.length) {
        const cell = targets.pop();
        const x = cell[0];
        const y = cell[1];
        if (x >= 0 && y >= 0 && x < SIZE && y < SIZE && !board.shots.has(x + ',' + y)) return [x, y];
      }
      const open = [];
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (!board.shots.has(x + ',' + y) && (x + y) % 2 === 0) open.push([x, y]);
        }
      }
      if (!open.length) {
        for (let y = 0; y < SIZE; y++) {
          for (let x = 0; x < SIZE; x++) {
            if (!board.shots.has(x + ',' + y)) open.push([x, y]);
          }
        }
      }
      return open[Math.floor(roll() * open.length)];
    },
    learn(cell, result) {
      const x = cell[0];
      const y = cell[1];
      if (result === 'hit') targets.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      if (result === 'sunk') targets.length = 0;
    },
  };
}
