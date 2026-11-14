import { explorerLink, NEAR_TESTNET_RPC } from './testnet.js';

/**
 * NEAR adapter boundary: game code never holds secrets in-repo.
 * Production bot round swaps mock for a server-side signer; tests stay offline.
 */

export function createMockNearAdapter(options = {}) {
  const network = options.network === 'mainnet' ? 'mainnet' : 'testnet';
  if (network === 'mainnet') {
    throw new Error('Harbor Market scaffold is testnet-only.');
  }
  return {
    kind: 'mock',
    rpc: NEAR_TESTNET_RPC,
    queue: [],
    receipts: [],
  };
}

export function mockSubmitSettlement(adapter, entry) {
  const txHash = 'MOCK_' + adapter.receipts.length.toString(16).padStart(8, '0');
  const receipt = {
    ...entry,
    txHash,
    explorer: explorerLink(txHash),
    rpc: adapter.rpc,
    status: 'simulated',
  };
  adapter.receipts.push(receipt);
  return receipt;
}
