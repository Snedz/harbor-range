import { mockSubmitSettlement } from './adapter.js';
import { ledgerToNep245Batch, serializeHarborSettlementPayload } from './nep245.js';

export function enqueueSettlement(adapter, ledgerEntry) {
  adapter.queue.push({ ...ledgerEntry, enqueuedAt: adapter.receipts.length });
}

export function flushSettlement(adapter) {
  const out = [];
  const batch = [];
  while (adapter.queue.length) {
    const entry = adapter.queue.shift();
    batch.push(entry);
    out.push(mockSubmitSettlement(adapter, entry));
  }
  if (batch.length) {
    adapter.lastNep245Batch = ledgerToNep245Batch(batch);
    adapter.lastSettlementPayload = serializeHarborSettlementPayload(batch);
  }
  return out;
}
