import { bumpDemand, shipwrightCanTrade, shipwrightQuote } from './shipwrights.js';

export function findShipwright(states, id) {
  return states.find((entry) => entry.id === id) ?? null;
}

export function listQuotes(states, shipwrightId, side) {
  const sw = findShipwright(states, shipwrightId);
  if (!sw || !shipwrightCanTrade(sw)) return [];
  const goods = side === 'buy' ? sw.stocks : sw.buys;
  return goods.map((goodId) => ({ ...shipwrightQuote(sw, goodId, side), shipwrightId: sw.id, side }));
}

export function sellSalvage(states, shipwrightId, goodId, units, player) {
  const sw = findShipwright(states, shipwrightId);
  if (!sw || !shipwrightCanTrade(sw)) return { ok: false, error: 'Shipwright is closed.' };
  if (!sw.buys.includes(goodId)) return { ok: false, error: 'They do not buy that good.' };
  const qty = units | 0;
  if (qty <= 0) return { ok: false, error: 'Quantity must be positive.' };
  if ((player.salvage[goodId] ?? 0) < qty) return { ok: false, error: 'Not enough salvage.' };

  const quote = shipwrightQuote(sw, goodId, 'sell');
  const payout = quote.price * qty;
  if ((sw.wallet.coin ?? 0) < payout) {
    sw.open = false;
    return { ok: false, error: 'Shipwright ran out of coin and closed the stall.' };
  }

  player.salvage[goodId] -= qty;
  player.coin += payout;
  sw.wallet.coin -= payout;
  sw.wallet[goodId] = (sw.wallet[goodId] ?? 0) + qty;
  bumpDemand(sw, goodId, qty);
  return {
    ok: true,
    payout,
    quote,
    ledger: {
      kind: 'sell',
      shipwright: sw.accountId,
      goodId,
      units: qty,
      coin: payout,
    },
  };
}

export function buyUpgrade(states, shipwrightId, upgrade, player) {
  const sw = findShipwright(states, shipwrightId);
  if (!sw || !shipwrightCanTrade(sw)) return { ok: false, error: 'Shipwright is closed.' };
  const cost = upgrade.cost.coin ?? 0;
  if (player.coin < cost) return { ok: false, error: 'Not enough harbor coin.' };
  if (player.upgrades.includes(upgrade.id)) return { ok: false, error: 'Upgrade already owned.' };

  player.coin -= cost;
  sw.wallet.coin += cost;
  player.upgrades.push(upgrade.id);
  bumpDemand(sw, 'coin', 1);
  return {
    ok: true,
    upgrade: upgrade.id,
    ledger: {
      kind: 'upgrade',
      shipwright: sw.accountId,
      upgrade: upgrade.id,
      coin: cost,
    },
  };
}
