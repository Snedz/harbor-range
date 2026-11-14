import { UPGRADES } from './constants.js';
import { buyUpgrade, listQuotes, sellSalvage } from './market.js';
import { createShipwrightStates } from './shipwrights.js';
import { emptySalvage, mergeSalvage } from './salvage.js';
import { enqueueSettlement, flushSettlement } from './near/settlement.js';

export function createHarborSession() {
  return {
    shipwrights: createShipwrightStates(),
    player: {
      coin: 0,
      salvage: emptySalvage(),
      upgrades: [],
    },
    pendingLedger: [],
  };
}

export function dockAfterMatch(session, salvageGained) {
  mergeSalvage(session.player, salvageGained);
  return {
    salvage: { ...session.player.salvage },
    coin: session.player.coin,
    upgrades: session.player.upgrades.slice(),
  };
}

export function harborQuotes(session, shipwrightId) {
  return {
    buy: listQuotes(session.shipwrights, shipwrightId, 'buy'),
    sell: listQuotes(session.shipwrights, shipwrightId, 'sell'),
  };
}

export function harborSell(session, shipwrightId, goodId, units, trader = session.player) {
  const result = sellSalvage(session.shipwrights, shipwrightId, goodId, units, trader);
  if (result.ok && result.ledger) session.pendingLedger.push(result.ledger);
  return result;
}

export function harborBuyUpgrade(session, shipwrightId, upgradeId) {
  const upgrade = UPGRADES.find((entry) => entry.id === upgradeId);
  if (!upgrade) return { ok: false, error: 'Unknown upgrade.' };
  const result = buyUpgrade(session.shipwrights, shipwrightId, upgrade, session.player);
  if (result.ok && result.ledger) session.pendingLedger.push(result.ledger);
  return result;
}

export function settleHarborBatch(session, adapter) {
  const batch = session.pendingLedger.splice(0, session.pendingLedger.length);
  for (let i = 0; i < batch.length; i++) enqueueSettlement(adapter, batch[i]);
  return flushSettlement(adapter);
}
