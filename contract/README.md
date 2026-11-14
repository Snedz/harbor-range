# Harbor Market contract (NEP-245 sketch)

Testnet-only settlement ledger for Grid Fleet Harbor Market. The browser game keeps using the mock adapter until live keys are injected from the environment (never committed).

`record_settlement` accepts JSON from `serializeHarborSettlementPayload()` in `src/harbor/near/nep245.js` (version `1`, `ft_transfer` rows) and credits shipwright balances on-chain in this sketch.

## Build (local)

Requires **Rust 1.85+** and Cargo that supports the `near-sdk` 5.5 lockfile (VM snapshots may be older; build on a current toolchain before deploy).

```
rustup target add wasm32-unknown-unknown
cd contract/harbor-market
cargo test
cargo build --target wasm32-unknown-unknown --release
```

Wasm artifact: `target/wasm32-unknown-unknown/release/harbor_market.wasm`

## Deploy (testnet, founder/bot with env keys)

```
export NEAR_ENV=testnet
export NEAR_CONTRACT_ID=harbor-market.<your-account>.testnet
export NEAR_OWNER_ID=<your-account>.testnet
# NEAR CLI reads ~/.near-credentials or NEAR_PRIVATE_KEY — never commit keys.
./scripts/deploy_harbor_testnet.sh
```

Document the deployed `NEAR_CONTRACT_ID` in your run notes; do not paste private keys.
