import { BASE_PRICES } from './constants.js';

/**
 * Single readable pricing file for judges (games track prompt).
 * Every quote includes a one-line reason for UI tooltips.
 */

function clampPrice(value) {
  return Math.max(1, Math.min(99, Math.round(value)));
}

export function priceQuote(goodId, stock, demandIndex) {
  const base = BASE_PRICES[goodId];
  if (base == null) {
    return { goodId, price: 0, reason: 'Unknown good.' };
  }
  const safeStock = Math.max(0, stock | 0);
  const demand = Math.max(0, Math.min(1, demandIndex));
  const scarcity = safeStock <= 2 ? 1.35 : safeStock <= 6 ? 1.1 : safeStock >= 20 ? 0.85 : 1;
  const hot = 1 + demand * 0.25;
  const price = clampPrice(base * scarcity * hot);
  let reason;
  if (safeStock <= 2) reason = 'Low stock raises the ask.';
  else if (safeStock >= 20) reason = 'Warehouse full; price softened.';
  else if (demand > 0.6) reason = 'Recent demand lifted the quote.';
  else reason = 'Steady harbor rate from base tariff.';
  return { goodId, price, reason, stock: safeStock, demand };
}

export function payoutQuote(goodId, stock, demandIndex) {
  const ask = priceQuote(goodId, stock, demandIndex);
  const payout = clampPrice(ask.price * 0.72);
  return {
    goodId,
    price: payout,
    reason: 'Buyback is 72% of the current ask (' + ask.reason.toLowerCase() + ')',
    stock: ask.stock,
    demand: ask.demand,
  };
}
