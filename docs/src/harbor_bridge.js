import {
  createHarborSession,
  dockAfterMatch,
  harborBuyUpgrade,
  harborQuotes,
  harborSell,
  salvageFromShots,
  settleHarborBatch,
} from './harbor/index.js';
import { createMockNearAdapter } from './harbor/near/adapter.js';
import { harborSimPreviewLines } from './harbor/sim_preview.js';

export { harborSimPreviewLines };

let harborSession = createHarborSession();
let nearAdapter = createMockNearAdapter();

export function resetHarborSession() {
  harborSession = createHarborSession();
  nearAdapter = createMockNearAdapter();
}

export function getHarborSummary() {
  return {
    coin: harborSession.player.coin,
    salvage: { ...harborSession.player.salvage },
    upgrades: harborSession.player.upgrades.slice(),
    pending: harborSession.pendingLedger.length,
  };
}

/** Upgrades purchased at the harbor apply to the next solo duel. */
export function getActiveHarborUpgrades() {
  return harborSession.player.upgrades.slice();
}

export function tryHarborBuyUpgrade(shipwrightId, upgradeId) {
  const result = harborBuyUpgrade(harborSession, shipwrightId, upgradeId);
  if (result.ok) settleHarborBatch(harborSession, nearAdapter);
  return result;
}

export function onLocalMatchEnd(localBoard) {
  if (!localBoard || !localBoard.foe || !localBoard.foe.shots) return null;
  const gained = salvageFromShots(localBoard.foe.shots);
  const docked = dockAfterMatch(harborSession, gained);
  const receipts = settleHarborBatch(harborSession, nearAdapter);
  return { docked, receipts, quotes: harborQuotes(harborSession, 'ironmonger') };
}

export function quickSellIron(units) {
  const result = harborSell(harborSession, 'ironmonger', 'iron', units);
  if (result.ok) settleHarborBatch(harborSession, nearAdapter);
  return result;
}

export function sellHarborSalvage(shipwrightId, goodId, units) {
  const result = harborSell(harborSession, shipwrightId, goodId, units);
  if (result.ok) settleHarborBatch(harborSession, nearAdapter);
  return result;
}

export function formatHarborStatus(summary) {
  if (!summary || !summary.docked) return '';
  const s = summary.docked.salvage;
  const receiptCount = Array.isArray(summary.receipts) ? summary.receipts.length : 0;
  const settlement =
    receiptCount > 0
      ? ` Mock testnet settled ${receiptCount} batch(es); no wallet prompt.`
      : ' Chain settles in background on testnet; players never see a wallet.';
  return (
    'Docked at harbor. Salvage iron ' +
    s.iron +
    ', timber ' +
    s.timber +
    ', canvas ' +
    s.canvas +
    '. Coin ' +
    summary.docked.coin +
    '.' +
    settlement
  );
}
