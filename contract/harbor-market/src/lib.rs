//! Harbor Market — NEP-245-style multi-token sketch for Grid Fleet (testnet only).
//! Token ids match `src/harbor/near/nep245.js`: `harbor-coin`, `harbor-iron`, `harbor-timber`, `harbor-canvas`.
//! Full near-sdk-contract-tools integration lands in the Nov 10 bot window.

use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::{env, log, near_bindgen, AccountId};
use serde::Deserialize;

#[derive(Deserialize)]
struct SettlementPayload {
    version: u32,
    transfers: Vec<SettlementTransfer>,
}

#[derive(Deserialize)]
struct SettlementTransfer {
    #[serde(rename = "type")]
    transfer_type: String,
    from: String,
    token_id: String,
    amount: String,
    memo: Option<String>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize)]
pub struct HarborMarket {
    owner: AccountId,
    /// Key: "{account_id}:{token_id}" → balance (string amounts for JSON batch parity).
    balances: UnorderedMap<String, u128>,
    settlement_count: u64,
}

impl Default for HarborMarket {
    fn default() -> Self {
        Self {
            owner: "owner.testnet".parse().expect("valid default owner"),
            balances: UnorderedMap::new(b"b"),
            settlement_count: 0,
        }
    }
}

#[near_bindgen]
impl HarborMarket {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        Self {
            owner,
            balances: UnorderedMap::new(b"b"),
            settlement_count: 0,
        }
    }

    /// Settlement log + balance sketch for harbor batches (JSON from `serializeHarborSettlementPayload`).
    pub fn record_settlement(&mut self, payload: String) {
        self.assert_owner();
        self.settlement_count += 1;
        if let Ok(parsed) = serde_json::from_str::<SettlementPayload>(&payload) {
            assert_eq!(parsed.version, 1, "unsupported settlement version");
            for transfer in parsed.transfers {
                if transfer.transfer_type == "ft_transfer" {
                    let amount: u128 = transfer
                        .amount
                        .parse()
                        .unwrap_or_else(|_| env::panic_str("invalid transfer amount"));
                    let account: AccountId = transfer
                        .from
                        .parse()
                        .unwrap_or_else(|_| env::panic_str("invalid transfer from account"));
                    self.credit_balance(&account, &transfer.token_id, amount);
                }
            }
        }
        log!("harbor_settlement:{}:{}", self.settlement_count, payload);
    }

    pub fn mint(&mut self, account: AccountId, token_id: String, amount: u128) {
        self.assert_owner();
        self.credit_balance(&account, &token_id, amount);
    }

    pub fn balance_of(&self, account: AccountId, token_id: String) -> u128 {
        self.balances
            .get(&balance_key(&account, &token_id))
            .unwrap_or(0)
    }

    pub fn get_settlement_count(&self) -> u64 {
        self.settlement_count
    }

    fn assert_owner(&self) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only owner");
    }

    fn credit_balance(&mut self, account: &AccountId, token_id: &str, amount: u128) {
        let key = balance_key(account, token_id);
        let next = self.balances.get(&key).unwrap_or(0).saturating_add(amount);
        self.balances.insert(&key, &next);
    }
}

fn balance_key(account: &AccountId, token_id: &str) -> String {
    format!("{}:{}", account, token_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    #[test]
    fn mint_and_balance() {
        let owner = accounts(0);
        let mut ctx = VMContextBuilder::new();
        ctx.predecessor_account_id(owner.clone());
        testing_env!(ctx.build());
        let mut contract = HarborMarket::new(owner.clone());
        contract.mint(accounts(1), "harbor-iron".to_string(), 10);
        assert_eq!(
            contract.balance_of(accounts(1), "harbor-iron".to_string()),
            10
        );
    }

    #[test]
    fn record_settlement_increments_count() {
        let owner = accounts(0);
        let mut ctx = VMContextBuilder::new();
        ctx.predecessor_account_id(owner.clone());
        testing_env!(ctx.build());
        let mut contract = HarborMarket::new(owner.clone());
        contract.record_settlement(r#"{"version":1,"transfers":[]}"#.to_string());
        assert_eq!(contract.get_settlement_count(), 1);
    }

    #[test]
    fn record_settlement_applies_ft_transfer() {
        let owner = accounts(0);
        let shipwright = accounts(1);
        let mut ctx = VMContextBuilder::new();
        ctx.predecessor_account_id(owner.clone());
        testing_env!(ctx.build());
        let mut contract = HarborMarket::new(owner.clone());
        let payload = format!(
            r#"{{"version":1,"transfers":[{{"type":"ft_transfer","from":"{}","token_id":"harbor-iron","amount":"4","memo":"sell:12"}}]}}"#,
            shipwright
        );
        contract.record_settlement(payload);
        assert_eq!(
            contract.balance_of(shipwright, "harbor-iron".to_string()),
            4
        );
    }
}
