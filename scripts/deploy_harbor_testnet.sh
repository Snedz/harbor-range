#!/usr/bin/env bash
# Deploy Harbor Market wasm to NEAR testnet. Keys come from env or ~/.near-credentials only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRATE="$ROOT/contract/harbor-market"
WASM="$CRATE/target/wasm32-unknown-unknown/release/harbor_market.wasm"

if [[ "${NEAR_ENV:-testnet}" != "testnet" ]]; then
  echo "refusing: Harbor Market deploy is testnet-only (NEAR_ENV=${NEAR_ENV:-})" >&2
  exit 1
fi

if [[ -z "${NEAR_CONTRACT_ID:-}" || -z "${NEAR_OWNER_ID:-}" ]]; then
  echo "Set NEAR_CONTRACT_ID and NEAR_OWNER_ID (testnet account labels, no secrets in repo)." >&2
  exit 1
fi

if ! command -v near >/dev/null 2>&1; then
  echo "near CLI not installed; build wasm only:" >&2
  echo "  cd contract/harbor-market && cargo build --target wasm32-unknown-unknown --release" >&2
  exit 2
fi

if [[ ! -f "$WASM" ]]; then
  (cd "$CRATE" && cargo build --target wasm32-unknown-unknown --release)
fi

near deploy "$NEAR_CONTRACT_ID" "$WASM" --init-function new --init-args "{\"owner\":\"$NEAR_OWNER_ID\"}"
echo "deployed: $NEAR_CONTRACT_ID (owner $NEAR_OWNER_ID)"
