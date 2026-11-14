import { createHarborSession, harborSell, settleHarborBatch } from '../session.js';
import { createMockNearAdapter } from './adapter.js';
import { parseHarborSettlementPayload, validateHarborSettlementPayload } from './nep245.js';

/** One sell + mock flush — produces the JSON a testnet `record_settlement` call would carry. */
export function buildHarborSettlementSample() {
  const session = createHarborSession();
  session.player.salvage.iron = 6;
  const sell = harborSell(session, 'ironmonger', 'iron', 2);
  if (!sell.ok) {
    throw new Error(`sample sell failed: ${sell.error ?? 'unknown'}`);
  }
  const adapter = createMockNearAdapter({ network: 'testnet' });
  settleHarborBatch(session, adapter);
  if (!adapter.lastSettlementPayload) {
    throw new Error('sample settlement produced no payload');
  }
  const parsed = JSON.parse(adapter.lastSettlementPayload);
  const validation = validateHarborSettlementPayload(parsed);
  const jsonCheck = parseHarborSettlementPayload(adapter.lastSettlementPayload);
  return { adapter, payload: parsed, validation, jsonCheck };
}
