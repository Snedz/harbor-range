/** NEP-245 batch sketch — maps harbor ledger rows to multi-token ids (no chain calls here). */

export const HARBOR_TOKEN_IDS = Object.freeze({
  coin: 'harbor-coin',
  iron: 'harbor-iron',
  timber: 'harbor-timber',
  canvas: 'harbor-canvas',
});

export function tokenIdForGood(goodId) {
  const mapped = HARBOR_TOKEN_IDS[goodId];
  if (!mapped) throw new Error(`unknown harbor good for NEP-245: ${goodId}`);
  return mapped;
}

/** JSON payload shape for `HarborMarket::record_settlement` (contract sketch). */
export function serializeHarborSettlementPayload(entries) {
  const transfers = ledgerToNep245Batch(entries);
  return JSON.stringify({ version: 1, transfers });
}

const ALLOWED_TRANSFER_TYPES = new Set(['ft_transfer']);
const ALLOWED_TOKEN_IDS = new Set(Object.values(HARBOR_TOKEN_IDS));

/** Judge/CI gate: JSON payload matches `HarborMarket::record_settlement` sketch. */
export function validateHarborSettlementPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['payload must be an object'] };
  }
  if (payload.version !== 1) errors.push('version must be 1');
  if (!Array.isArray(payload.transfers) || payload.transfers.length < 1) {
    errors.push('transfers must be a non-empty array');
  } else {
    for (let i = 0; i < payload.transfers.length; i++) {
      const t = payload.transfers[i];
      const prefix = `transfers[${i}]`;
      if (!t || typeof t !== 'object') {
        errors.push(`${prefix} must be an object`);
        continue;
      }
      if (!ALLOWED_TRANSFER_TYPES.has(t.type)) errors.push(`${prefix}.type must be ft_transfer`);
      if (typeof t.from !== 'string' || !t.from) errors.push(`${prefix}.from must be a non-empty string`);
      if (!ALLOWED_TOKEN_IDS.has(t.token_id)) errors.push(`${prefix}.token_id unknown`);
      if (typeof t.amount !== 'string' || !/^\d+$/.test(t.amount) || t.amount === '0') {
        errors.push(`${prefix}.amount must be a non-zero digit string`);
      }
      if (t.memo !== undefined && (typeof t.memo !== 'string' || !t.memo)) {
        errors.push(`${prefix}.memo must be a non-empty string when present`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export function parseHarborSettlementPayload(json) {
  let payload;
  try {
    payload = JSON.parse(json);
  } catch (err) {
    return { ok: false, errors: [`invalid JSON: ${String(err?.message ?? err)}`] };
  }
  return validateHarborSettlementPayload(payload);
}

export function formatHarborSettlementSummary(payload) {
  const check = validateHarborSettlementPayload(payload);
  if (!check.ok) {
    return `Harbor Settlement FAIL ${check.errors[0] ?? 'invalid payload'}`;
  }
  return `Harbor Settlement PASS transfers=${payload.transfers.length}`;
}

export function ledgerToNep245Batch(entries) {
  return entries.map((entry) => {
    if (entry.kind === 'sell') {
      return {
        type: 'ft_transfer',
        from: entry.shipwright,
        token_id: tokenIdForGood(entry.goodId),
        amount: String(entry.units),
        memo: `sell:${entry.coin}`,
      };
    }
    if (entry.kind === 'upgrade') {
      return {
        type: 'ft_transfer',
        from: entry.shipwright,
        token_id: HARBOR_TOKEN_IDS.coin,
        amount: String(entry.coin),
        memo: `upgrade:${entry.upgrade}`,
      };
    }
    throw new Error(`unsupported ledger kind: ${entry.kind}`);
  });
}
