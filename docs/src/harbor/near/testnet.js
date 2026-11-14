/** Public NEAR testnet endpoints only — no keys, no mainnet. */

export const NEAR_TESTNET_RPC = 'https://rpc.testnet.near.org';
export const NEAR_EXPLORER_TX = 'https://testnet.nearblocks.io/txns/';

export function explorerLink(txHash) {
  if (!txHash) return '';
  return NEAR_EXPLORER_TX + encodeURIComponent(txHash);
}
