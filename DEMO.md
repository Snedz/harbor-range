# Harbor Range — judge walkthrough

**Tracks:** NEAR HACKATHON · AI Security & Defense (`security`) + Agent Economy (`agents`)
**Path in repo:** `.` (repository root)
**Wallet / keys / network:** not required. The NEAR layer is a mock testnet
adapter; everything runs locally and deterministically.

Harbor Range is a proving range for agent spend policies: three scripted
attacker personas spend a week attacking a small agent economy, and the
week ends in a pass/fail survival verdict.

## The five-minute path

| Step | Command (from the repository root) | Expected result |
|------|------------------------------------|-----------------|
| 1 | `npm install` | Completes without error. The package has zero dependencies — there is nothing to download. |
| 2 | `npm test` | All green: `tests 41`, `pass 41`, `fail 0`. |
| 3 | `npm run attack` | The 7-day attack log, then 10 `GREEN` condition lines, ending `GREEN: all 10 conditions hold.` Exit code 0. |
| 4 | `npm run harbor:judge:check` | Exit code 0; the four PASS lines below on stderr. |
| 5 | `npm run harbor:range` | JSON report on stdout with `"stallsSurvivedAttack": true`; PASS line on stderr. |

Step 4's exact output (stderr):

```
Harbor Range PASS seed=1 openStalls=1 settlements=2 playerCoin=1008
Harbor Week PASS openStalls=2 settlements=3 playerCoin=16
Harbor Settlement PASS transfers=1
Harbor Judge Demo PASS range=1 week=42 transfers=1
```

The seeds are fixed (range `1`, week `42`), so these numbers reproduce
exactly on any machine. PASS lines are printed to stderr by design, so
step 5's JSON stays clean on stdout for piping.

## What step 3 shows

One attack per day, rotating `iron_flooder` → `wash_trader` →
`buy_everything`, over ordinary background trade (12 scripted traders a
day). Recorded run:

```
day 0  iron_flooder     1 trades, 1 refused, stalls open after: 2  HELD
day 1  wash_trader     24 trades, 24 refused, stalls open after: 1  HELD
day 2  buy_everything   3 attempts, 3 refused, stalls open after: 1  HELD
day 3  iron_flooder    24 trades, 24 refused, stalls open after: 1  HELD
day 4  wash_trader     24 trades, 24 refused, stalls open after: 1  HELD
day 5  buy_everything   3 attempts, 3 refused, stalls open after: 1  HELD
day 6  iron_flooder    24 trades, 24 refused, stalls open after: 1  HELD
```

Two stalls close during the week — by refusing payouts they cannot
cover, not by being drained. The Coinhouse never closes. The ten
conditions the command then asserts are listed in
[ATTACK-CATALOGUE.md](ATTACK-CATALOGUE.md), which also maps every
scenario to the invariant it tests and its observed result.

## Step 5's report, in full shape

```json
{
  "days": 7,
  "seed": 1,
  "playerCoin": 1008,
  "settlements": 2,
  "openStalls": 1,
  "stallsSurvivedAttack": true,
  "attackReports": [ "... 7 entries, one per day ..." ]
}
```

`playerCoin = 1008` is itself evidence: 1,000 of it is coin the
`buy_everything` persona injected on days 2 and 5 and never managed to
spend (every attempt refused); the other 8 is honest background-trader
sales. Try another seed with `node scripts/run_harbor_range_sim.js 42` —
numeric fields vary, but the sim exits 1 if `stallsSurvivedAttack` is
ever false or the report is malformed.

## Optional deeper checks

| Command | What it proves |
|---------|----------------|
| `npm run harbor:week` | The control case: a week of background trade with no attackers. `Harbor Week PASS openStalls=2 settlements=3 playerCoin=16` (seed 42). |
| `npm run harbor:settlement:check` | A sample ledger batch mapped to NEP-245-shaped transfers; JSON on stdout, `Harbor Settlement PASS transfers=1` on stderr. |
| `npm run harbor:demo:check` | The full gate in one command: every harbor check above plus the contract-sketch gate; ends `Harbor Demo PASS hackathon=1 bridge=1`. |
| `npm run test:contract-sketch` | Static gate over the undeployed Rust contract sketch: pinned `near-sdk`, token ids aligned with `nep245.js`, deploy script refuses mainnet and contains no secrets. (Cargo-dependent tests skip when Cargo is absent.) |

## Troubleshooting

| Symptom | Explanation |
|---------|-------------|
| PASS lines "missing" from stdout | They are on stderr by design. In a terminal both streams appear together; when piping, add `2>&1` to see them. |
| `harbor:range` exits 1 | The survival invariant failed or the report was malformed — that is the range working as intended. Re-run with seed `1`; a failure on the default seed is a genuine finding. |
| Anything asking for a wallet or keys | Nothing in this package should. The adapter is a mock and refuses mainnet in code. |
