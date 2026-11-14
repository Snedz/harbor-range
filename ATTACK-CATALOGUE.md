# Attack catalogue — Harbor Range

Every scenario the range knows how to run, the invariant it tests, and the
result observed on the recorded run. A scenario only counts when its verdict
is asserted by code: the range sim validates its own report and exits
non-zero if the survival invariant fails, and `npm run attack` re-checks
every condition below and exits 1 if any line disagrees.

**Recorded run:** `node scripts/run_harbor_range_sim.js` (seed 1) and
`node scripts/run_harbor_week_sim.js` (seed 42), re-run and confirmed with
`npm run attack` — 10 of 10 conditions GREEN. These are deterministic local
simulation results, not chain data; the same commands on a fresh clone
reproduce them exactly.

## The week at a glance (seed 1)

| Day | Persona | What happened | Stalls open after |
|-----|---------|---------------|-------------------|
| 0 | `iron_flooder` | First 12-crate iron sale refused — it would have paid out more than the stall holds. Ironmonger closed with its reserve intact. | 2 |
| 1 | `wash_trader` | 24 rapid timber/canvas sells, all refused; Timberyard closed during the day. | 1 |
| 2 | `buy_everything` | 3 upgrade attempts, all refused (`Shipwright is closed.`). | 1 |
| 3 | `iron_flooder` | 24 trades against the closed Ironmonger, all refused. | 1 |
| 4 | `wash_trader` | 24 trades, all refused. | 1 |
| 5 | `buy_everything` | 3 attempts, all refused. | 1 |
| 6 | `iron_flooder` | 24 trades, all refused. Coinhouse still open at week's end. | 1 |

Final report: `openStalls = 1`, `stallsSurvivedAttack = true`,
`settlements = 2`, `playerCoin = 1008`.

## Scenarios

### 1. Baseline week — ordinary trade, no attackers

- **Run:** `npm run harbor:week` (seed 42). Twelve scripted background
  traders a day sell salvage for seven days; every sale settles in a batch.
- **Invariant:** a market with no adversary stays alive and keeps settling —
  the control case the attack week is compared against.
- **Observed:** `Harbor Week PASS openStalls=2 settlements=3 playerCoin=16`.

### 2. `iron_flooder` — inventory flood against stall solvency

- **Attack:** the bot arrives with 240 crates of iron and sells to the
  Ironmonger in 12-crate lots, up to 24 trades, stopping only when a stall
  breaks or it runs dry.
- **Invariant under test:** a stall never pays out more coin than its
  reserve holds. A sale that would break the reserve is refused, and the
  stall closes *instead of* paying — closure is the guard, not the failure.
- **Observed (day 0):** the very first lot is refused with
  `Shipwright ran out of coin and closed the stall.` — the Ironmonger's
  8-coin reserve cannot cover a 12-crate payout, so no coin moves and the
  stall closes holding its reserve. On days 3 and 6 the flooder keeps
  selling at the closed stall: 24 of 24 refused.

### 3. `wash_trader` — wash volume against price integrity

- **Attack:** a fixed four-trade pattern (timber, canvas, timber, canvas)
  repeated six times against the Timberyard — 24 rapid sells meant to look
  like activity and drag demand-driven prices around.
- **Invariant under test:** volume alone extracts nothing. Prices move with
  demand, but every payout is still bounded by the stall's reserve, and a
  stall that cannot cover a payout refuses it and closes.
- **Observed (day 1):** all 24 trades refused; the Timberyard closes during
  the day (stalls open drop 2 → 1). Day 4 repeats the pattern against the
  closed stall: 24 of 24 refused.

### 4. `buy_everything` — runaway spend, the prompt-injected agent

- **Attack:** the persona models an agent talked into spending freely: it
  injects 500 coin and immediately tries to buy every upgrade the market
  sells (sonar, armour, skiff) in a single pass.
- **Invariant under test:** spend only happens through the market's rules —
  an open stall, the listed price, one of each upgrade, never on credit.
  There is no path around the stall.
- **Observed (days 2 and 5):** 3 attempts per day, every one refused with
  `Shipwright is closed.` The 1,000 coin injected across the two days ends
  the week unspent: final `playerCoin = 1008` is that 1,000 plus 8 coin of
  honest background-trader sales. On our own fleet this action class maps
  to dry-run-only in the spend deny matrix — an agent may rehearse this
  spend, never execute it with real keys.

### 5. Settlement batch — ledger to NEP-245-shaped transfers

- **Run:** `npm run harbor:settlement:check`.
- **Invariant under test:** every ledger entry the market produces maps to
  a well-formed multi-token transfer batch (token ids `harbor-coin`,
  `harbor-iron`, `harbor-timber`, `harbor-canvas`) that validates and
  survives a JSON round-trip unchanged.
- **Observed:** `Harbor Settlement PASS transfers=1`.

### 6. Adapter boundary — testnet only, in code

- **Check:** constructing the NEAR adapter with `network: 'mainnet'`.
- **Invariant under test:** the mock layer cannot be pointed at mainnet by
  configuration; it throws instead. Receipts it issues carry `MOCK_`-
  prefixed hashes and `status: 'simulated'`, so a mock settlement can
  never be mistaken for a chain record.
- **Observed:** `createMockNearAdapter({ network: 'mainnet' })` throws
  `Harbor Market scaffold is testnet-only.` — asserted in
  `npm run attack` (condition 9) and in `npm test`.

## How to read the verdict

Survival does **not** mean no stall ever closes — two of the three stalls
close during the seed-1 week, by design of the guard. It means:

1. no stall ever pays out coin it does not hold;
2. the market as a whole never fully closes (`openStalls ≥ 1` at day 7);
3. every refusal is recorded in the day's event log with the market's own
   reason string.

If any of those stop being true, the sim's validators reject the report and
the commands above exit non-zero.
