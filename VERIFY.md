# Verify — Harbor Range recorded outputs

Every judge command, its exit code, and its exact output, captured from
this tree on November 14, 2026. These are **deterministic local
simulation results, not chain data**: settlements run through a mock
NEAR testnet adapter and no transaction reaches any network. Re-running
any command on a fresh clone reproduces its output exactly (the one
exception is `npm test`, whose per-test wall-clock durations vary; its
counts — 41 passed, 0 failed — do not).

## The one command

`npm run verify` runs the whole battery (unit tests, cage check, judge
demo, range week, same-seed control, adaptive scenario, negative
control, seed sweep) and prints one summary. Exit code 0.

```text
$ npm run verify

> harbor-range@0.1.0 verify
> node scripts/run_harbor_verify.js

Harbor Verify — battery summary
  PASS  test      unit tests (41) — 41 passed, 0 failed
  PASS  attack    cage check (attack week, 10 conditions) — GREEN: all 10 conditions hold.
  PASS  judge     judge demo — Harbor Judge Demo PASS range=1 week=42 transfers=1
  PASS  range     range week (seed 1) — stallsSurvivedAttack = true, openStalls = 1
  PASS  control   same-seed control (seed 1, no attackers) — baseline openStalls = 2 vs attack week 1
  PASS  adaptive  adaptive raider scenario — Harbor Adaptive PASS trades=7 accepted=6 refused=1 extracted=23 openStalls=2
  PASS  negative  negative control (partial payouts must fail) — weakened run rejected: 2 reserve breaches
  PASS  sweep     seed sweep (seeds 1..100) — Harbor Seed Sweep PASS held=100/100 seeds=1..100 minOpenStalls=1
VERIFY PASS: 8/8 checks green.
```

## `npm test` — exit 0

```text

> harbor-range@0.1.0 test
> node --test test/harbor.test.js test/attackers.test.js test/harbor_sim_preview.test.js test/harbor_bridge.test.js test/harbor_battle_buffs.test.js test/harbor_solo_loop.test.js

✔ createAttackerBot seeds inventory per persona (1.838379ms)
✔ runHarborRangeDay rotates attackers across the week (1.385379ms)
✔ iron flooder performs trades without crashing the session (0.258017ms)
✔ wash trader cycles timber and canvas sells (0.247932ms)
✔ buy everything attempts each upgrade once (0.593541ms)
✔ pricing returns a reason on every quote (65.603502ms)
✔ salvage counts hits from Grid Fleet shot maps (1.14662ms)
✔ harbor sell enqueues settlement on mock testnet adapter (1.134833ms)
✔ fast-forward sim completes a week without closing every stall (1.286741ms)
✔ mock adapter rejects mainnet (1.043506ms)
✔ Harbor Range sim keeps at least one stall open after attacker week (2.288073ms)
✔ Harbor Range sim is deterministic for a fixed seed (1.941904ms)
✔ Harbor Range seed 1 matches judge DEMO golden summary (1.120452ms)
✔ validateHarborAttackReportEntry rejects empty events (1.01958ms)
✔ validateHarborRangeReport rejects malformed attackReports (5.055797ms)
✔ formatHarborRangeSummary marks PASS when stalls survive (1.977217ms)
✔ formatHarborStatus mentions mock settlement when receipts exist (0.363265ms)
✔ normalizeHarborSimSeed coerces invalid input to default (0.657827ms)
✔ ledger maps sells to NEP-245 token ids (0.184247ms)
✔ settlement flush attaches nep245 batch on adapter (3.17166ms)
✔ serializeHarborSettlementPayload matches contract JSON shape (0.262174ms)
✔ validateHarborSettlementPayload rejects malformed batches (0.693661ms)
✔ formatHarborWeekSummary marks PASS when stalls stay open (0.529704ms)
✔ validateHarborWeekReport accepts a week sim summary (0.235954ms)
✔ validateHarborWeekReport rejects empty settlements (0.309264ms)
✔ validateHarborRangeReport rejects when stalls did not survive attack week (0.128142ms)
✔ runHarborJudgeDemo passes fixed seeds for judge dry-run (0.954822ms)
✔ buildHarborSettlementSample yields valid NEP-245 JSON (0.196905ms)
✔ validateHarborSettlementPayload rejects zero amounts (0.105539ms)
✔ buildHarborBattleBuffs maps upgrade ids to battle flags (46.534325ms)
✔ pickSonarReveal returns a hidden ship cell (4.644891ms)
✔ fireWithHarborArmor turns the first carrier hit into a miss (5.019673ms)
✔ tryHarborBuyUpgrade exposes upgrades for the next duel (7.121788ms)
✔ fire baseline still works without harbor buffs (0.648544ms)
✔ onLocalMatchEnd docks salvage and quickSellIron settles mock batches (2.503177ms)
✔ tryHarborBuyUpgrade rejects sonar until the player earns harbor coin (60.244439ms)
✔ onLocalMatchEnd ignores boards without foe shots (2.557748ms)
✔ harbor_bridge re-exports harborSimPreviewLines for in-browser fast-forward (5.856478ms)
✔ harborSimPreviewLines returns PASS lines for week and range (11.529032ms)
✔ harborSimPreviewLines normalizes invalid seeds (4.241675ms)
✔ runHarborSoloLoopProof completes dock sell buy and arms sonar for next duel (2.875706ms)
ℹ tests 41
ℹ suites 0
ℹ pass 41
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 912.221106
```

The adaptive scenario's own tests are separate, so this count stays
the recorded 41: `npm run test:adaptive` — 5 passed, 0 failed.

## `npm run attack` — exit 0

The cage check: the 7-day attack log, then one line per condition.

```text

> harbor-range@0.1.0 attack
> node scripts/run_harbor_cage_check.js

Harbor Range — attack log (seed 1, 7 days)
  day 0  iron_flooder     1 trades, 1 refused, stalls open after: 2  HELD
  day 1  wash_trader     24 trades, 24 refused, stalls open after: 1  HELD
  day 2  buy_everything   3 attempts, 3 refused, stalls open after: 1  HELD
  day 3  iron_flooder    24 trades, 24 refused, stalls open after: 1  HELD
  day 4  wash_trader     24 trades, 24 refused, stalls open after: 1  HELD
  day 5  buy_everything   3 attempts, 3 refused, stalls open after: 1  HELD
  day 6  iron_flooder    24 trades, 24 refused, stalls open after: 1  HELD

GREEN  range report validates against its schema — validateHarborRangeReport: ok
GREEN  survival invariant holds for the range week — stallsSurvivedAttack = true
GREEN  at least one stall is still open after day 7 — openStalls = 1 of 3
GREEN  every attack day left a non-empty event log — 7/7 days logged
GREEN  runaway-spend persona fired fully and stayed inside the upgrade list — 3/3 attempts, all logged; 3/3 attempts, all logged
GREEN  background-trader week (no attackers) validates and keeps stalls open — openStalls = 2, settlements = 3, playerCoin = 16
GREEN  settlement sample validates and round-trips as JSON — validation ok, JSON round-trip ok
GREEN  settlement summary reports PASS with at least one transfer — Harbor Settlement PASS transfers=1
GREEN  mock NEAR adapter refuses mainnet — createMockNearAdapter({ network: "mainnet" }) throws
GREEN  determinism: two seed-1 range runs are identical — reports compared byte for byte
GREEN: all 10 conditions hold.
```

## `npm run harbor:judge:check` — exit 0 (verdict lines on stderr)

```text
Harbor Range PASS seed=1 openStalls=1 settlements=2 playerCoin=1008
Harbor Week PASS openStalls=2 settlements=3 playerCoin=16
Harbor Settlement PASS transfers=1
Harbor Judge Demo PASS range=1 week=42 transfers=1
```

## `npm run harbor:range` — exit 0 (verdict line on stderr)

```text
Harbor Range PASS seed=1 openStalls=1 settlements=2 playerCoin=1008
```

<details>
<summary>Full seed-1 JSON report (stdout)</summary>

```json

> harbor-range@0.1.0 harbor:range
> node scripts/run_harbor_range_sim.js

{
  "days": 7,
  "seed": 1,
  "playerCoin": 1008,
  "settlements": 2,
  "openStalls": 1,
  "stallsSurvivedAttack": true,
  "attackReports": [
    {
      "attacker": "iron_flooder",
      "trades": 1,
      "openStalls": 2,
      "events": [
        {
          "ok": false,
          "error": "Shipwright ran out of coin and closed the stall.",
          "openStalls": 2
        }
      ]
    },
    {
      "attacker": "wash_trader",
      "trades": 24,
      "openStalls": 1,
      "events": [
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        }
      ]
    },
    {
      "attacker": "buy_everything",
      "attempts": 3,
      "openStalls": 1,
      "events": [
        {
          "upgrade": "sonar",
          "ok": false,
          "error": "Shipwright is closed."
        },
        {
          "upgrade": "armor",
          "ok": false,
          "error": "Shipwright is closed."
        },
        {
          "upgrade": "skiff",
          "ok": false,
          "error": "Shipwright is closed."
        }
      ]
    },
    {
      "attacker": "iron_flooder",
      "trades": 24,
      "openStalls": 1,
      "events": [
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        }
      ]
    },
    {
      "attacker": "wash_trader",
      "trades": 24,
      "openStalls": 1,
      "events": [
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "timber",
          "openStalls": 1
        },
        {
          "ok": false,
          "good": "canvas",
          "openStalls": 1
        }
      ]
    },
    {
      "attacker": "buy_everything",
      "attempts": 3,
      "openStalls": 1,
      "events": [
        {
          "upgrade": "sonar",
          "ok": false,
          "error": "Shipwright is closed."
        },
        {
          "upgrade": "armor",
          "ok": false,
          "error": "Shipwright is closed."
        },
        {
          "upgrade": "skiff",
          "ok": false,
          "error": "Shipwright is closed."
        }
      ]
    },
    {
      "attacker": "iron_flooder",
      "trades": 24,
      "openStalls": 1,
      "events": [
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        },
        {
          "ok": false,
          "error": "Shipwright is closed.",
          "openStalls": 1
        }
      ]
    }
  ]
}
```

</details>

## `npm run harbor:control:check` — exit 0

The no-attacker baseline week at the attack week's own seed (1), run
with the week sim's parameters — the attributable control.

```text

> harbor-range@0.1.0 harbor:control:check
> node scripts/run_harbor_control_check.js

Harbor Control — no-attacker baseline week at seed 1 (attack week seed)
  control (no attackers, 20 traders/day): Harbor Week PASS openStalls=2 settlements=3 playerCoin=16
  attack  (personas, 12 traders/day):     Harbor Range PASS seed=1 openStalls=1 settlements=2 playerCoin=1008
  read: the baseline ends with 2 stalls open and 16 player coin (all of it legitimate trade; no coin is injected in the control). The attack week ends with 1 stall open and 1008 player coin, of which 1,000 is the buy_everything persona's injected, unspent coin — so 8 coin of legitimate background sales settled during the attack week too.
Harbor Control PASS seed=1 baseline validates and keeps stalls open
```

## `npm run harbor:adaptive:check` — exit 0 (verdict line on stderr)

```text

> harbor-range@0.1.0 harbor:adaptive:check
> node scripts/run_harbor_adaptive_check.js

Harbor Adaptive — probe (published sell quotes, best first)
  coinhouse    iron    payout 4/unit
  coinhouse    canvas  payout 4/unit
  ironmonger   iron    payout 4/unit
  timberyard   canvas  payout 4/unit
  coinhouse    timber  payout 3/unit
  ironmonger   timber  payout 3/unit
  timberyard   timber  payout 3/unit

Harbor Adaptive — attack log (lot sized from the raider reserve model)
  trade  1  coinhouse    iron    lot  1  accepted, payout 4  stalls open: 3
  trade  2  coinhouse    canvas  lot  1  accepted, payout 4  stalls open: 3
  trade  3  ironmonger   iron    lot  1  accepted, payout 4  stalls open: 3
  trade  4  ironmonger   iron    lot  1  accepted, payout 3  stalls open: 3
  trade  5  ironmonger   iron    lot  2 (overshoot)  refused: Shipwright ran out of coin and closed the stall.  stalls open: 2
  trade  6  timberyard   canvas  lot  1  accepted, payout 4  stalls open: 2
  trade  7  timberyard   canvas  lot  1  accepted, payout 4  stalls open: 2

adaptation: 2 retargets (probe rank order, one stall at a time, none revisited), 1 deliberate overshoots, extracted 23 coin against 24 of opening reserve
Harbor Adaptive PASS trades=7 accepted=6 refused=1 extracted=23 openStalls=2
```

## `npm run harbor:negative:check` — exit 0

The control wrapper: it re-runs the week against a weakened policy
(partial payouts) and exits 0 only because that run is rejected.
`node scripts/run_harbor_negative_check.js --weakened-only` prints the
same weakened run and exits 1.

```text

> harbor-range@0.1.0 harbor:negative:check
> node scripts/run_harbor_negative_check.js

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

Negative Control PASS: the weakened run is rejected by the solvency invariant (2 reserve breaches; the real policy has 0). The instrument can fail a bad policy.
```

## `npm run harbor:sweep:check` — exit 0

```text

> harbor-range@0.1.0 harbor:sweep:check
> node scripts/run_harbor_seed_sweep.js

Harbor Seed Sweep — range week, seeds 1..100
  openStalls = 1: 100 seeds
  settlements across held seeds: 271
Harbor Seed Sweep PASS held=100/100 seeds=1..100 minOpenStalls=1
```
