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
reproduce them exactly. The full battery — every scenario below, plus the
same-seed control, the adaptive scenario, the negative control, and the
100-seed sweep — runs as one command, `npm run verify` (8/8 checks
green); exact outputs are recorded in [VERIFY.md](VERIFY.md).

## The 10 cage conditions

`npm run attack` asserts each of these by name; any one failing exits 1:

1. range report validates against its schema
2. survival invariant holds for the range week
3. at least one stall is still open after day 7
4. every attack day left a non-empty event log
5. runaway-spend persona fired fully and stayed inside the upgrade list
6. background-trader week (no attackers) validates and keeps stalls open
7. settlement sample validates and round-trips as JSON
8. settlement summary reports PASS with at least one transfer
9. mock NEAR adapter refuses mainnet
10. determinism: two seed-1 range runs are identical

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

## It does not just refuse everything

The refusals above are selective, and the numbers show it. During the
seed-1 attack week the market settled **8 coin of legitimate
background-trader sales**: the final `playerCoin = 1008` is the
`buy_everything` persona's 1,000 injected coin — refused everywhere,
left unspent — plus 8 coin of honest trade that cleared normally
through the same stalls, in the same week, under the same rules. Every
attack trade was refused; ordinary trade was not.

## Scenarios

### 1. Baseline week — ordinary trade, no attackers

- **Run:** `npm run harbor:week` (seed 42). Twenty scripted background
  traders a day sell salvage for seven days; every sale settles in a batch.
- **Invariant:** a market with no adversary stays alive and keeps settling —
  the control case the attack week is compared against.
- **Observed:** `Harbor Week PASS openStalls=2 settlements=3 playerCoin=16`.
- **Why the baseline ends a stall down:** on day 0, a background
  trader's ordinary 3-timber sale to the Timberyard quoted a 9-coin
  payout against the stall's 8-coin reserve. The market refused the
  sale in full and the Timberyard closed holding all 8 coin — an
  ordinary reserve closure on a legitimate trade, with no attacker
  involved. It is the same guard the flooder meets in scenario 2:
  closure instead of overpayment, whoever is selling.
- **Same-seed control:** the baseline above runs seed 42 while the
  attack week runs seed 1, so the comparison is not attributable on
  its own. `npm run harbor:control:check` runs the no-attacker week
  at seed 1, the attack week's own seed (week-sim parameters: 20
  traders a day, no personas, no injected coin). Observed:
  `Harbor Week PASS openStalls=2 settlements=3 playerCoin=16` against
  the attack week's `openStalls=1` — the baseline keeps two stalls
  open, and all 16 of its player coin is legitimate trade.

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

### 7. `adaptive_raider` — one adaptive scenario, separate from the week

- **Run:** `npm run harbor:adaptive:check` (tests:
  `npm run test:adaptive`).
- **Attack:** the raider does not follow a fixed script. It reads the
  market's published sell quotes for every stall/good pair, ranks the
  stalls by payout, and commits to one stall at a time in that order.
  On each stall it opens with a 1-unit calibration trade, then sizes
  lots from a reserve model — the published 8-coin opening reserve
  minus what it has extracted — and every fifth trade it deliberately
  overshoots that model by one unit to test whether the bound is real.
  A refusal ends the stall; the raider moves on and never returns.
- **Invariant under test:** the same solvency invariant, asserted per
  trade from outside the market: every accepted payout must be covered
  by the coin the stall held before the trade, and no refusal may move
  coin. Plus the market-level claim: at least one stall open at the end.
- **Observed:** `Harbor Adaptive PASS trades=7 accepted=6 refused=1
  extracted=23 openStalls=2`. The raider extracted 23 of the market's
  24 reserve coin *within* the rules — two stalls paid out exactly to
  zero. The 24th coin is the one it could not take: its overshoot lot
  against the Ironmonger was refused (`Shipwright ran out of coin and
  closed the stall.`), and the stall closed still holding that coin.
  This is one scripted adaptation rule, not a learning agent — see the
  README's honest limits.

### 8. Negative control — partial payouts, a policy the range must fail

- **Run:** `npm run harbor:negative:check` (the weakened run alone:
  `node scripts/run_harbor_negative_check.js --weakened-only`, exit 1).
- **The break:** the least-strawman weakening of the policy. Everything
  is the range's own — personas, background traders, settlement,
  report shape — except one branch of the sell: when a quoted payout
  exceeds a stall's reserve, the weakened stall **pays what it has**
  instead of refusing in full and closing. The weakened market lives
  only in the check script; no shipped code changes.
- **Why it matters:** a self-test that prints PASS is worth nothing if
  it cannot fail. Under partial payouts the weakened week ends with
  `openStalls = 3` — a *better* headline than the real policy's 1 —
  while every stall stands drained to 0 coin. The report is even
  schema-valid. Only the solvency invariant rejects it: 2 reserve
  breaches, starting with the flooder's very first lot.
- **Observed (the failing run's actual output, exit 1):**

```text
Harbor Negative Control — weakened policy: partial payouts allowed
(an over-reserve sale pays what the stall has and the stall stays open,
 instead of the real policy: refuse in full, close, keep the reserve)

Weakened attack log (seed 1, 7 days)
  day 0  iron_flooder    24 trades, 23 refused, stalls open after: 3
  day 1  wash_trader     24 trades, 24 refused, stalls open after: 3
  day 2  buy_everything   3 attempts, 3 refused, stalls open after: 3
  day 3  iron_flooder    24 trades, 24 refused, stalls open after: 3
  day 4  wash_trader     24 trades, 24 refused, stalls open after: 3
  day 5  buy_everything   3 attempts, 3 refused, stalls open after: 3
  day 6  iron_flooder    24 trades, 24 refused, stalls open after: 3

Reserve breaches (sale quoted above the stall's reserve, paid partially): 2
  day 0  iron_flooder    12 iron -> ironmonger: quoted payout 48, reserve 8, paid 8
  day 0  background      3 timber -> timberyard: quoted payout 9, reserve 8, paid 8

stalls drained to 0 coin while still flagged open: 3 (ironmonger, timberyard, coinhouse)
schema validation (validateHarborRangeReport): ok — the report is well-formed
Harbor Range FAIL seed=1 openStalls=3 breaches=2 (weakened policy: partial payouts; first breach day 0: iron_flooder sold 12 iron to ironmonger, quoted 48 against reserve 8, paid 8 instead of refusing)
```

The control wrapper (`npm run harbor:negative:check`) exits 0 only
because this rejection happened: `Negative Control PASS: the weakened
run is rejected by the solvency invariant (2 reserve breaches; the
real policy has 0).`

### 9. Seed sweep — the invariant across 100 fixed seeds

- **Run:** `npm run harbor:sweep:check`.
- **What it does:** the full range week (personas, background traders,
  settlement) once per seed for seeds 1–100 — a fixed seed set, no
  randomness in the sweep itself — asserting for every seed that the
  report validates and the survival invariant holds.
- **Observed:** every seed ends with exactly one stall open:
  `openStalls = 1: 100 seeds`; 271 settlements across the sweep.
  `Harbor Seed Sweep PASS held=100/100 seeds=1..100 minOpenStalls=1`.

## How to read the verdict

Survival does **not** mean no stall ever closes — two of the three stalls
close during the seed-1 week, by design of the guard. It means:

1. no stall ever pays out coin it does not hold;
2. the market as a whole never fully closes (`openStalls ≥ 1` at day 7);
3. every refusal is recorded in the day's event log with the market's own
   reason string.

If any of those stop being true, the sim's validators reject the report and
the commands above exit non-zero.
