import { SHIPWRIGHTS } from './constants.js';
import { payoutQuote, priceQuote } from './pricing.js';

function emptyWallet() {
  return { coin: 8, iron: 6, timber: 6, canvas: 4 };
}

export function createShipwrightStates() {
  return SHIPWRIGHTS.map((sw) => ({
    ...sw,
    open: true,
    wallet: emptyWallet(),
    demand: 0.35,
  }));
}

export function shipwrightQuote(state, goodId, side) {
  const stock = state.wallet[goodId] ?? 0;
  if (side === 'buy') return priceQuote(goodId, stock, state.demand);
  return payoutQuote(goodId, stock, state.demand);
}

export function bumpDemand(state, _goodId, units) {
  const delta = Math.min(1, (units | 0) * 0.04);
  state.demand = Math.min(1, state.demand + delta);
}

export function shipwrightCanTrade(state) {
  return state.open && (state.wallet.coin ?? 0) > 0;
}
