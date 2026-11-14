# Harbor Range

**A red-team proving range for agent spend policies.**

Scripted attacker personas spend a week attacking a small agent economy —
three NPC market stalls with finite coin reserves, demand-driven prices,
and a settlement ledger. The economy defends itself with nothing but its
market rules, and the week ends in a pass/fail verdict. The primary
claim is solvency: **no stall ever pays out coin it does not hold**. The
secondary, market-level claim is survival: at least one stall still
open at week's end (`stallsSurvivedAttack`). If the invariant fails,
the sim rejects its own report and the commands exit non-zero.

Built at **NEAR HACKATHON** — tracks **AI Security & Defense**
(`security`) and **Agent Economy** (`agents`).

**The only standalone proving range found in the field.** The security
track's other entries are guards — a spend policy testing itself.
Harbor Range is the range a policy is brought to: the personas, the
invariants, and the verdict are independent of the market under test,
and the whole battery re-runs deterministically from a fresh clone.

**Recorded verdicts** (exact outputs in [VERIFY.md](VERIFY.md)):
41/41 unit tests · 10/10 cage conditions · `Harbor Judge Demo PASS` ·
survival invariant held on **100/100 seeds** · the adaptive raider
held to the invariant · a deliberately weakened policy (partial
payouts) **rejected** by the negative control. One command runs the
battery: `npm run verify` — **8/8 checks green**.

**Live demo:** https://snedz.github.io/harbor-range/ — runs the actual
cage-check code in your browser, no install needed.

## Why this exists

We run a fleet of agents that can spend. Before any spend policy is
trusted near a real wallet, it should survive rehearsed abuse: an
inventory flood, wash volume, and the classic prompt-injected agent
trying to buy everything at once. The security track's own example
prompt asks for an attack demo with a shown log; Harbor Range
generalizes that one-off demo into a reusable range — the same personas,
the same invariants, a deterministic verdict anyone can re-run from a
fresh clone.

For the Agent Economy track, read the range as pre-deployment
certification: an agent that will hold a wallet first runs its spend
policy here, against rehearsed abuse and a same-seed control, and
ships only if the verdict is green — the same gate we apply to our
own fleet's spend actions before any of them touch a real key.

## What is real, what is mock

| | |
|---|---|
| **Real** | The economy and its rules: stall reserves, reserve-bounded payouts, demand-driven pricing, closed-stall refusals, the settlement ledger. The three attacker personas and the 7-day range orchestration. The report validators — a run that breaks the invariant fails loudly. The full test suite (41 tests) and the attack log: every refusal quoted in this repo is the market's own output. |
| **Mock** | NEAR settlement. Trades settle through a mock testnet adapter (`src/harbor/near/`) that records NEP-245-shaped transfer batches locally and issues receipts with `MOCK_`-prefixed hashes and `status: 'simulated'`. No transaction reaches any chain. |
| **Sketch only** | `contract/harbor-market/` is an undeployed Rust contract sketch (NEP-245-style `record_settlement`). A static gate test pins its dependencies and checks the deploy script carries no secrets; nothing builds or deploys it in the demo path. |
| **Not here** | No wallet, no keys, no mainnet. The adapter refuses mainnet in code. |

## Judge steps: do this, see that

From a fresh clone, at the repository root. No wallet, key, or network
needed (Node.js 18 or newer; the package has zero dependencies).

| # | Do this | See that |
|---|---------|----------|
| 0 | `npm run verify` | The whole battery (tests, cage check, judge demo, range week, same-seed control, adaptive scenario, negative control, seed sweep) in one summary, ending `VERIFY PASS: 8/8 checks green.` Exit code 0. Exact outputs: [VERIFY.md](VERIFY.md). |
| 1 | `npm install` | Completes cleanly; there is nothing to install (zero dependencies). |
| 2 | `npm test` | `tests 41`, `pass 41`, `fail 0`. |
| 3 | `npm run attack` | The 7-day attack log (each day: persona, trades, refusals, stalls still open, `HELD`), then one `GREEN` line per condition, ending `GREEN: all 10 conditions hold.` Exit code 0. |
| 4 | `npm run harbor:judge:check` | Exit code 0, and on stderr the four lines below. |
| 5 | `npm run harbor:range` | A JSON report on stdout with `"stallsSurvivedAttack": true`; `Harbor Range PASS …` on stderr. |

Exact output of step 4 (stderr):

```
Harbor Range PASS seed=1 openStalls=1 settlements=2 playerCoin=1008
Harbor Week PASS openStalls=2 settlements=3 playerCoin=16
Harbor Settlement PASS transfers=1
Harbor Judge Demo PASS range=1 week=42 transfers=1
```

The PASS lines deliberately go to stderr so step 5's JSON stays clean on
stdout. Seeds are fixed (range 1, week 42): re-running reproduces these
numbers exactly.

## The red team

One persona attacks per day, rotating across the 7-day week, on top of
twelve background traders a day of ordinary volume. Full detail, with
the observed seed-1 results for every scenario, is in
[ATTACK-CATALOGUE.md](ATTACK-CATALOGUE.md).

| Persona | Attack | What survival means |
|---------|--------|---------------------|
| `iron_flooder` | Dumps 240 crates of iron on the Ironmonger in 12-crate lots, up to 24 trades, until a stall breaks or it runs dry. | The stall never pays beyond its reserve: the first oversized sale is refused and the stall closes *with its coin intact*. Flooding closes a stall; it cannot drain one. |
| `wash_trader` | A fixed 4-trade timber/canvas pattern repeated 6 times against the Timberyard — wash-style volume with no real economic activity behind it. | Volume alone extracts nothing. Prices may move with demand, but payouts stay reserve-bounded and an uncoverable payout is refused. |
| `buy_everything` | The prompt-injected agent: injects 500 coin and tries to buy every upgrade (sonar, armour, skiff) in one pass. | Spend only happens through market rules — open stall, listed price, one of each, no credit. On the recorded run both of its days end with every attempt refused and its 1,000 injected coin unspent. |

Survival is a market-level claim, not a stall-level one: on seed 1, two
of the three stalls close during the week — by refusing, not by being
drained. The Coinhouse is still open on day 7.

## The spend policy under test

The policy is the market itself (`src/harbor/market.js`,
`src/harbor/shipwrights.js`):

- Every stall holds a finite coin reserve (8 coin at open) and can only
  trade while open and solvent.
- A sell whose payout exceeds the stall's reserve is refused in full —
  never partially paid — and the stall closes.
- Prices are quoted from stock and a demand level that every trade
  moves, so floods and wash volume move prices but cannot mint coin.
- An upgrade purchase needs an open stall, the listed price in hand,
  and an upgrade not already owned.
- Every accepted trade appends to a settlement ledger; rejected trades
  append nothing. Batches from the ledger are what the NEAR layer
  records.

## The NEAR boundary

`src/harbor/near/` is the whole chain surface: `nep245.js` maps ledger
entries to a multi-token transfer batch (token ids `harbor-coin`,
`harbor-iron`, `harbor-timber`, `harbor-canvas`), `settlement.js`
queues and flushes batches, and `adapter.js` is the mock — testnet-only
by construction, with the public testnet RPC URL recorded on each
receipt so a production swap to a server-side signer has one seam to
land in. Stall account ids in the ledger (`ironmonger.harbor.testnet`,
…) are public labels only.

## Honest limits

- The NEAR layer is a settlement *sketch* on a mock adapter, not a live
  market: no deployed contract, no on-chain proof, nothing a judge can
  recount on an explorer. The included Rust contract is a sketch with a
  static gate test, nothing more.
- The economy is small by design — 3 stalls, 3 goods, 3 upgrades — so a
  week runs in milliseconds and fits in one report. It proves the
  policy mechanics, not scale.
- The three week personas are scripted, not adaptive: they rehearse
  known abuse shapes and do not invent new ones. One separate scenario
  (`npm run harbor:adaptive:check`) is adaptive in a narrow sense — it
  probes published quotes, commits to one stall at a time, and sizes
  lots from a reserve model it corrects on refusals — but it follows a
  scripted adaptation rule; it is not a learning agent.
- The hosted demo at https://snedz.github.io/harbor-range/ runs the
  cage-check code in the browser; the full battery is still a terminal
  run with fixed seeds, and the demo video carries the visual case.

## Provenance (hackathon Q-001 – Q-005)

- The harbor economy, the three attacker personas, the range/week sims,
  and the mock NEAR settlement layer were built inside the hackathon
  window, from **November 5, 2026**, as a feature of the **Grid Fleet**
  game project.
- The base game predates the window (first commit **October 22, 2026**)
  and is baseline under Q-001/Q-002. It is not part of this entry beyond
  the economy's lineage, and the game itself is a separate project that
  is **not** submitted to this hackathon.
- This standalone package was extracted from the game's repository on
  **November 14, 2026**: the harbor module, its judge/range scripts and
  tests, and the contract sketch, separated and disclosed here per
  Q-003. Extracted files are byte-identical to the game repo's harbor
  tree; the only new code is the cage-check script
  (`scripts/run_harbor_cage_check.js`) and these documents.

### Extraction notes

- `src/harbor_bridge.js` and `src/engine.js` are included because the
  harbor tests import them: the bridge carries the harbor status-line
  formatter the tests assert on, and `engine.js` is the game's
  dependency-free board module whose `newShots()` helper builds the
  salvage fixtures in `test/harbor.test.js`. The judge demo, range sim,
  and cage check never import `engine.js`. No game client, match, or
  server (Nakama) code is included.
- `src/harbor/solo_loop.js` and `src/harbor/battle_buffs.js` ship with
  the harbor module because its public barrel (`src/harbor/index.js`)
  exports them; they are the harbor side of the game's duel coupling
  (harbor-bought upgrades affecting a duel) and are covered by their
  own tests.
- The fleet-side spend-policy mapping (`harbor_spend_policy.py`, which
  maps these personas to the Program 67 deny matrix — attack actions
  classify as dry-run-only) lives in the fleet monorepo and is not
  vendored here: it depends on a policy module outside the harbor tree,
  and this package ships only what runs standalone.

## Dependencies and licences

- **Runtime: none.** Zero npm dependencies; Node.js built-ins only.
- This package's code: **MIT** (see [LICENSE](LICENSE)).
- The contract sketch pins `near-sdk =5.5.0` in
  `contract/harbor-market/Cargo.toml` (reference only — it is not built
  or deployed by any command in this package).

## Licence

MIT — see [LICENSE](LICENSE).
