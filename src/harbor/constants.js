/** Harbor Market shared constants (chain-free core). */

export const GOODS = Object.freeze([
  { id: 'iron', label: 'Iron plates', unit: 'crate' },
  { id: 'timber', label: 'Timber', unit: 'bundle' },
  { id: 'canvas', label: 'Canvas', unit: 'roll' },
  { id: 'coin', label: 'Harbor coin', unit: 'token' },
]);

export const UPGRADES = Object.freeze([
  { id: 'sonar', label: 'Sonar ping', cost: { coin: 12 }, effect: 'Reveal one random enemy cell at battle start.' },
  { id: 'armor', label: 'Armour plate', cost: { coin: 18 }, effect: 'First hit on your largest ship becomes a miss.' },
  { id: 'skiff', label: 'Spare skiff', cost: { coin: 10 }, effect: 'Patrol ship may be placed twice (second is decoy, cosmetic in v1).' },
]);

/** NPC shipwrights: testnet account ids are public labels only in scaffold. */
export const SHIPWRIGHTS = Object.freeze([
  {
    id: 'ironmonger',
    name: 'Ironmonger',
    accountId: 'ironmonger.harbor.testnet',
    stocks: ['iron', 'canvas'],
    buys: ['iron', 'timber'],
  },
  {
    id: 'timberyard',
    name: 'Timberyard',
    accountId: 'timberyard.harbor.testnet',
    stocks: ['timber', 'canvas'],
    buys: ['timber', 'canvas'],
  },
  {
    id: 'coinhouse',
    name: 'Coinhouse',
    accountId: 'coinhouse.harbor.testnet',
    stocks: ['coin'],
    buys: ['iron', 'timber', 'canvas'],
  },
]);

export const BASE_PRICES = Object.freeze({
  iron: 4,
  timber: 3,
  canvas: 5,
  coin: 1,
});
