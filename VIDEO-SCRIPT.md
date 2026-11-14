# Harbor Range — demo video script (~60 seconds)

Terminal only. The whole story is three commands and their output; there
is nothing to click and nothing to hide.

## Setup

- Fresh clone of this repo in a clean directory; terminal at least
  100 columns wide, large font, dark theme.
- Pre-type each command but do not run it until its beat.
- PASS lines print to **stderr** — in a normal terminal they appear
  inline with stdout, which is what the camera sees. Do not split the
  streams.
- **Never on screen:** a wallet, a private key or seed phrase, an
  `.env` file, an editor with anything but this repo. The demo needs
  none of them; say so in the captions.
- Total runtime of all three commands is under five seconds, so every
  beat can be one continuous take; pause on the output, not the typing.

## Beats

### Beat 1 — the range (0:00 – 0:10)

- **Run:** `npm run attack`
- **On screen:** the attack log starts scrolling: seven days, three
  personas.
- **Caption:** "Harbor Range — a proving range for agent spend policies."

### Beat 2 — three attacks (0:10 – 0:28)

- **On screen:** the day rows, held on each persona in turn:
  - day 0, `iron_flooder`: "1 trades, 1 refused, stalls open after: 2"
  - day 1, `wash_trader`: "24 trades, 24 refused"
  - day 2, `buy_everything`: "3 attempts, 3 refused"
- **Captions:**
  - "An inventory flood: the stall refuses the payout it cannot cover — and closes with its coin intact."
  - "Wash volume: twenty-four trades, nothing extracted."
  - "The prompt-injected agent, told to buy everything: every attempt refused."

### Beat 3 — the verdict list (0:28 – 0:40)

- **On screen:** the GREEN condition lines scroll; land on the last one:
  `GREEN: all 10 conditions hold.`
- **Caption:** "Every condition named, every one checked. The exit code is the verdict."

### Beat 4 — the invariant (0:40 – 0:50)

- **Run:** `npm run harbor:range`
- **On screen:** the JSON report; hold on `"openStalls": 1` and
  `"stallsSurvivedAttack": true`.
- **Caption:** "Seven days of attack. One stall still solvent — or the run fails."

### Beat 5 — reproducibility (0:50 – 1:00)

- **Run:** `npm run harbor:judge:check`
- **On screen:** the four PASS lines:

  ```
  Harbor Range PASS seed=1 openStalls=1 settlements=2 playerCoin=1008
  Harbor Week PASS openStalls=2 settlements=3 playerCoin=16
  Harbor Settlement PASS transfers=1
  Harbor Judge Demo PASS range=1 week=42 transfers=1
  ```

- **Closing caption:** "Deterministic from a fresh clone. Settlements run through a mock NEAR testnet adapter — no keys, no mainnet, nothing to trust."
