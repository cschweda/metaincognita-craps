# Craps Simulator — Doc 02: Phase 2 — Dice Engine & Bet Resolution Core

## Goal

Build the core engine: statistically correct dice generation, the complete bet resolution pipeline, and the game state machine that tracks which bets are active, which are resolved, and what the puck state is.

---

## 2A. Dice Module

```typescript
interface DiceRoll {
  die1: number      // 1–6
  die2: number      // 1–6
  total: number     // 2–12
  isHard: boolean   // die1 === die2
}

function roll(): DiceRoll {
  const die1 = Math.floor(Math.random() * 6) + 1
  const die2 = Math.floor(Math.random() * 6) + 1
  return { die1, die2, total: die1 + die2, isHard: die1 === die2 }
}
```

- Two independent uniform random integers in [1,6].
- `isHard` is true when die1 === die2 (used for hardway resolution).
- **No weighted dice, no dice control in v1.** Future enhancement: configurable distribution shift.
- **RNG:** `Math.random()` is sufficient for a learning tool. Not cryptographic, but statistically uniform for this use case.

---

## 2B. Game State Machine

```
States: SETUP → COME_OUT → POINT_PHASE → RESOLVING → BETWEEN_ROLLS → SEVEN_OUT → SHOOTER_CHANGE
```

### State Transitions

**`COME_OUT`** — Puck is OFF. Hero places pre-roll bets. Roll button active.

| Roll | Result | Transition |
|------|--------|------------|
| 7 or 11 | Natural — Pass wins, Don't Pass loses | Resolve → stay COME_OUT (same shooter) |
| 2, 3, or 12 | Craps — Pass loses. DP wins on 2/3, pushes on 12 | Resolve → stay COME_OUT (same shooter) |
| 4, 5, 6, 8, 9, 10 | Point established | Set point, puck ON → POINT_PHASE |

**`POINT_PHASE`** — Puck is ON. All bet types available. Roll button active.

| Roll | Result | Transition |
|------|--------|------------|
| = Point | Point hit — Pass wins, DP loses | Resolve → puck OFF → COME_OUT (same shooter) |
| 7 | Seven-out — Pass loses, DP wins, cascade all bets | SEVEN_OUT → SHOOTER_CHANGE → COME_OUT (new shooter) |
| Any other | Intermediate — resolve applicable bets only | Resolve applicable → stay POINT_PHASE |

**`RESOLVING`** — Intermediate state while payouts are calculated and animated. Locks bet placement and roll button. Exits to BETWEEN_ROLLS or SEVEN_OUT.

**`BETWEEN_ROLLS`** — Brief pause between resolution and next roll. Hero can adjust bets. Exits to COME_OUT or POINT_PHASE depending on puck state.

**`SEVEN_OUT`** — All bets cascade-resolve. Brief dramatic pause. Exits to SHOOTER_CHANGE.

**`SHOOTER_CHANGE`** — New shooter takes dice. Visual transition. Auto-advance to COME_OUT after brief pause.

### State Machine Implementation

```typescript
type GamePhase = 'SETUP' | 'COME_OUT' | 'POINT_PHASE' | 'RESOLVING' | 'BETWEEN_ROLLS' | 'SEVEN_OUT' | 'SHOOTER_CHANGE'

interface GameState {
  phase: GamePhase
  point: number | null
  puckState: 'ON' | 'OFF'
  shooterSeat: number
  rollNumber: number
  shooterRollCount: number
}
```

The state machine should be implemented as an explicit transition function:

```typescript
function transition(state: GameState, event: GameEvent): GameState
```

No implicit state changes — every transition is auditable, testable, and logged.

---

## 2C. Bet Manager

The central bet tracking system. This is the most complex piece of the engine.

### ActiveBet Interface

```typescript
interface ActiveBet {
  id: string                        // unique bet ID (uuid or incrementing)
  type: BetType                     // see BetType enum below
  owner: string                     // 'hero' | bot ID
  amount: number                    // wager amount in cents (integer)
  oddsAmount: number                // attached odds bet in cents (0 if none)
  pointNumber: number | null        // established point (for come/don't come)
  isContract: boolean               // true = cannot be removed
  isWorking: boolean                // ON/OFF lammer state
  status: 'pending' | 'active' | 'resolved'
  placedOnRoll: number              // roll number when placed
  resolvedOnRoll: number | null     // roll number when resolved
}

type BetType =
  | 'pass' | 'dontPass'
  | 'passOdds' | 'dontPassOdds'
  | 'come' | 'dontCome'
  | 'comeOdds' | 'dontComeOdds'
  | 'place4' | 'place5' | 'place6' | 'place8' | 'place9' | 'place10'
  | 'buy4' | 'buy5' | 'buy6' | 'buy8' | 'buy9' | 'buy10'
  | 'lay4' | 'lay5' | 'lay6' | 'lay8' | 'lay9' | 'lay10'
  | 'field'
  | 'hard4' | 'hard6' | 'hard8' | 'hard10'
  | 'any7' | 'anyCraps' | 'aces' | 'boxcars' | 'aceDeuce' | 'yo'
  | 'crapsEleven' | 'horn' | 'hornHigh'
  | 'big6' | 'big8'
  | 'hopEasy' | 'hopHard'
```

### Bet Lifecycle Examples

**Pass Line lifecycle:**
1. Hero places $10 Pass Line during COME_OUT. Status: `active`, `isContract: false` (not yet locked).
2. Come-out roll is 6 → Point established. Pass Line becomes contract: `isContract: true`. Cannot be removed.
3. Subsequent rolls: no effect on Pass Line until Point (6) or 7.
4. Roll is 6 → Pass Line wins. Status: `resolved`. Pays 1:1 ($10).
5. OR roll is 7 → Pass Line loses. Status: `resolved`. Loses $10.

**Come bet lifecycle (the hardest one):**
1. Hero places $10 Come during POINT_PHASE. Status: `pending`. Lives in COME area on table.
2. Next roll is 9 → Come bet establishes Come Point of 9. Chip moves to 9 box. Status: `active`, `pointNumber: 9`, `isContract: true`. Hero can now add Come Odds.
3. Hero adds $20 Come Odds on the 9. New ActiveBet: type `comeOdds`, linked to the Come bet by pointNumber.
4. Subsequent rolls:
   - Roll 9 → Come bet wins 1:1 ($10). Come Odds win 3:2 ($30). Both resolved.
   - Roll 7 → Come bet loses ($10). Come Odds lose ($20). Both resolved. (Plus everything else — seven-out cascade.)
   - Roll anything else → No effect on this Come bet. Other bets may resolve.

**Come bet on a natural (first-roll resolution):**
1. Hero places $10 Come during POINT_PHASE.
2. Next roll is 7 → Come bet WINS immediately (7 is a natural for a Come bet's first roll). Pays 1:1.
3. BUT: This is also a seven-out for the main Pass Line. So the hero's Come bet wins, but the Pass Line loses, and all other established Come bets lose. This is the single most confusing moment in craps, and the simulator MUST handle it correctly.

**Hardway lifecycle:**
1. Hero places $5 Hard 6. Status: `active`.
2. Roll 3+3 → Hard 6 hits! Pays 9:1 ($45). Status: `resolved`.
3. OR roll 2+4, 1+5, 4+2, 5+1 → Easy 6. Hard 6 loses. Status: `resolved`.
4. OR roll 7 → Hard 6 loses. Status: `resolved`.
5. Any other roll → No effect. Hard 6 stays active.

### Bet Validation Rules

Before accepting a new bet, validate:

| Bet Type | Valid When | Invalid When |
|----------|-----------|--------------|
| Pass Line | Puck OFF (COME_OUT) | Puck ON |
| Don't Pass | Puck OFF | Puck ON |
| Come | Puck ON (POINT_PHASE) | Puck OFF |
| Don't Come | Puck ON | Puck OFF |
| Pass/Come Odds | After point established for that bet | Before point |
| Don't Pass/Come Odds | After point established | Before point |
| Place bets | Any time during POINT_PHASE | — (can also be placed during COME_OUT but will be OFF by default) |
| Buy/Lay bets | Any time | — |
| Field | Any time | — |
| Hardways | Any time | — |
| Propositions | Any time | — |
| Big 6/8 | Any time | — |

Also validate:
- Bet amount ≥ table minimum.
- Bet amount ≤ table maximum.
- Odds amount ≤ max odds for the point number and table rules.
- Bet sizing produces whole-dollar payouts where applicable (warn on improper sizing).
- Player bankroll ≥ bet amount.
- **Don't Pass / Don't Come removal constraint (MBS 3.16.1):** These bets may be removed or reduced at any time, but once removed or reduced, they **may not be replaced or increased**. The bet manager must track whether a Don't Pass or Don't Come bet has been voluntarily reduced/removed during the current point cycle. If so, block any attempt to re-place or increase it. The advisor should warn before removal: "You can take this down, but you can't put it back."
- **Buy bet vig refund (MBS 3.4.10.1):** If a Buy bet is taken down before the next valid roll, the vigorish paid at placement must be refunded to the player's bankroll.

---

## 2D. Bet Resolver

```typescript
function resolveRoll(
  roll: DiceRoll,
  activeBets: ActiveBet[],
  gameState: GameState,
  tableRules: TableRules
): BetResolution[]
```

The resolver iterates through ALL active (non-resolved, isWorking) bets and determines the outcome for each given the current roll.

### BetResolution Interface

```typescript
interface BetResolution {
  betId: string
  betType: BetType
  owner: string
  outcome: 'win' | 'lose' | 'push' | 'no_action' | 'point_established'
  payout: number           // gross payout in cents (includes original wager for wins)
  netGain: number          // payout - wager (negative for losses, 0 for pushes)
  description: string      // human-readable: "Pass Line wins — $10"
}
```

### Resolution Order

Order matters for display and animation, not for correctness (each bet resolves independently). But the order should match casino flow:

1. **Pass Line / Don't Pass** (the primary bets).
2. **Pass Odds / Don't Pass Odds** (attached to line bets).
3. **Come / Don't Come — first-roll resolutions** (naturals/craps on pending Come bets).
4. **Come / Don't Come — established points** (point hit or seven-out).
5. **Come Odds / Don't Come Odds** (attached to established Come bets).
6. **Place bets** (check if their number hit, or if 7 killed them).
7. **Buy bets** (same as Place but with vig calculation).
8. **Lay bets** (inverse — win on 7, lose on their number).
9. **Field bet** (one-roll, check total).
10. **Hardway bets** (check isHard + total, or lose on easy or 7).
11. **Proposition bets** (one-roll, check specific conditions).
12. **Big 6 / Big 8** (check total = 6/8, lose on 7).

### Resolution Logic by Bet Type

#### Pass Line

**During COME_OUT (puck OFF):**
- Roll 7 or 11 → WIN. Pay 1:1.
- Roll 2, 3, or 12 → LOSE.
- Roll 4/5/6/8/9/10 → POINT_ESTABLISHED (not resolved — stays active, becomes contract).

**During POINT_PHASE (puck ON):**
- Roll = Point → WIN. Pay 1:1.
- Roll 7 → LOSE.
- Any other → NO_ACTION.

#### Don't Pass

**During COME_OUT:**
- Roll 2 or 3 → WIN. Pay 1:1.
- Roll 12 → PUSH (bar 12). Return wager.
- Roll 7 or 11 → LOSE.
- Roll 4/5/6/8/9/10 → POINT_ESTABLISHED (stays active).

**During POINT_PHASE:**
- Roll 7 → WIN. Pay 1:1.
- Roll = Point → LOSE.
- Any other → NO_ACTION.

#### Come (pending — no Come Point yet)

- Roll 7 or 11 → WIN. Pay 1:1.
- Roll 2, 3, or 12 → LOSE.
- Roll 4/5/6/8/9/10 → Establishes Come Point. Status becomes `active` with `pointNumber` set. Chip moves to that number on the table.

#### Come (established — has a Come Point)

- Roll = Come Point → WIN. Pay 1:1.
- Roll 7 → LOSE.
- Any other → NO_ACTION.

#### Don't Come (pending)

- Roll 2 or 3 → WIN. Pay 1:1.
- Roll 12 → PUSH.
- Roll 7 or 11 → LOSE.
- Roll 4/5/6/8/9/10 → Establishes Don't Come Point.

#### Don't Come (established)

- Roll 7 → WIN. Pay 1:1.
- Roll = Don't Come Point → LOSE.
- Any other → NO_ACTION.

#### Odds Bets (Pass, Don't Pass, Come, Don't Come)

Follow the parent bet — win when parent wins, lose when parent loses, no action otherwise. Payouts at true odds (see payout tables in Doc 00 or craps.config.ts).

#### Place Bets

- Roll = placed number → WIN. Pay per payout table (9:5 for 4/10, 7:5 for 5/9, 7:6 for 6/8).
- Roll 7 → LOSE.
- Any other → NO_ACTION.
- **Working check:** If `isWorking === false` (e.g., come-out default), treat as NO_ACTION even if the number hits or 7 rolls.

#### Buy Bets

Same as Place but pay at true odds minus vig:
- Roll = bought number → WIN. Pay true odds (2:1 for 4/10, 3:2 for 5/9, 6:5 for 6/8) minus 5% commission.
- Commission timing per table rules: deducted from wager at placement, or deducted from winnings.
- Roll 7 → LOSE.

#### Lay Bets

Inverse of Buy:
- Roll 7 → WIN. Pay inverse true odds (1:2 for 4/10, 2:3 for 5/9, 5:6 for 6/8) minus 5% commission on win amount.
- Roll = laid number → LOSE.
- Any other → NO_ACTION.
- **Always working (MBS 3.4.11):** Unlike Place/Buy bets, Lay bets are always in play on every roll — including come-out rolls — unless the player explicitly calls them OFF. No default-OFF behavior.

#### Field Bet

One-roll. Check the total:
- Total 2 → WIN. Pay 2:1 (or per table rules).
- Total 12 → WIN. Pay 3:1 (or 2:1 per table rules).
- Total 3, 4, 9, 10, 11 → WIN. Pay 1:1.
- Total 5, 6, 7, 8 → LOSE.

#### Hardway Bets

Multi-roll. Check total AND isHard:
- Total matches AND isHard → WIN. Pay per payout table.
- Total matches AND NOT isHard (easy) → LOSE.
- Roll 7 → LOSE.
- Any other → NO_ACTION.
- **Working check:** Same as Place bets — respect isWorking flag.

#### Proposition Bets (One-Roll)

All resolve on every roll:
- **Any 7:** Total = 7 → WIN (4:1). Otherwise → LOSE.
- **Any Craps:** Total = 2, 3, or 12 → WIN (7:1). Otherwise → LOSE.
- **Aces:** Total = 2 → WIN (30:1). Otherwise → LOSE.
- **Boxcars:** Total = 12 → WIN (30:1). Otherwise → LOSE.
- **Ace-Deuce:** Total = 3 → WIN (15:1). Otherwise → LOSE.
- **Yo:** Total = 11 → WIN (15:1). Otherwise → LOSE.
- **C&E:** Total = 2/3/12 → WIN (3:1). Total = 11 → WIN (7:1). Otherwise → LOSE.
- **Horn:** Total = 2/12 → WIN (30:1 on winning unit, lose 3 units). Total = 3/11 → WIN (15:1 on winning unit, lose 3 units). Otherwise → LOSE all 4 units.

#### Big 6 / Big 8

Multi-roll:
- Total = 6 (or 8) → WIN. Pay 1:1.
- Roll 7 → LOSE.
- Any other → NO_ACTION.

### Seven-Out Cascade

When a 7 rolls during POINT_PHASE, nearly everything resolves at once. This is the most complex single-roll resolution and must be tested exhaustively:

| Bet Type | Outcome |
|----------|---------|
| Pass Line + Odds | LOSE |
| Don't Pass + Odds | WIN |
| Established Come bets + Odds | LOSE |
| Established Don't Come bets + Odds | WIN |
| **Pending Come bets** (no point yet) | **WIN** (7 is a natural for first roll) |
| **Pending Don't Come bets** | **LOSE** (7 on first roll) |
| All Place bets | LOSE (if working) |
| All Buy bets | LOSE |
| All Lay bets | WIN |
| All Hardway bets | LOSE (if working) |
| Field | LOSE (7 is not a field number) |
| Any 7 | WIN |
| All other propositions | Check individually |
| Big 6 / Big 8 | LOSE |

**Critical edge case:** A pending Come bet WINS on the same roll that causes a seven-out. This is correct and must not be confused with the established Come bets that LOSE.

---

## 2E. Payout Calculator

```typescript
function calculatePayout(
  bet: ActiveBet,
  outcome: 'win',
  tableRules: TableRules
): number  // returns payout in cents
```

### Integer-Cent Arithmetic

**All money values stored as integer cents.** A $10 bet = 1000 cents. This avoids floating-point drift.

Example of the problem with floats:
```
$6 × 7/6 = $7.000000000000001  // floating point
600 × 7 / 6 = 700              // integer cents — exact
```

### Payout Ratio Application

All payout ratios are stored as `[numerator, denominator]` pairs:

```typescript
function applyRatio(amountCents: number, ratio: [number, number]): number {
  return Math.floor(amountCents * ratio[0] / ratio[1])
}
```

`Math.floor` implements casino rounding (always down).

### Vig Calculation for Buy/Lay Bets

Per MBS Rules 3.4.10 and 3.4.11: Buy bets pay 5% vigorish on the wager at placement. Lay bets pay 5% vigorish on the amount the player can win.

**Vig on bet (Buy bets — charged at placement):**

The vig is an **additional fee on top of the wager**, not deducted from it. The full wager amount is at risk and earns true-odds payout. The vig is a separate cost. Per MBS 3.4.10.1, if the Buy bet is taken down before the next valid roll, the vig is refunded.

```typescript
// Buy bet: vig is ADDITIONAL to the wager, not deducted from it.
// Player puts up (betAmount + vigAmount). If win: payout at true odds on betAmount.
// If lose: loses betAmount + vigAmount.
const vigAmount = Math.floor(betAmount * 0.05)  // 5%, rounded DOWN (player-favorable)
const totalCost = betAmount + vigAmount          // total leaving player's bankroll at placement
// If win: payout = applyRatio(betAmount, trueOddsRatio) + betAmount returned
// If lose: player loses totalCost
// If taken down before roll: vigAmount refunded
```

**Vig on win (Lay bets — charged at resolution):**

Per MBS 3.4.11: "5% vigorish shall be taken on the amount the Player can win."

```typescript
// Lay bet: vig is charged on the WIN amount, not the wager.
const grossPayout = applyRatio(betAmount, trueOddsRatio)
const vigAmount = Math.floor(grossPayout * 0.05)  // 5% of win, rounded DOWN
const netPayout = grossPayout - vigAmount
```

**Critical: Use `Math.floor` for vig, not `Math.ceil`.** The house edge reference values (Buy 4/10 vig-on-bet = 4.76%, Buy 4/10 vig-on-win = 1.67%, etc.) assume vig rounds down (player-favorable), which is standard casino practice. Using `Math.ceil` would increase the effective house edge beyond the documented values.

### Rounding Rules (Per Table Configuration)

All rounding uses `Math.floor` (round DOWN). This is Vegas convention and the canonical default for this simulator. The `payoutRounding` table rule controls the **minimum chip denomination** — the granularity of the floor operation — not the rounding direction.

| Setting | Behavior |
|---------|----------|
| `'dollar'` | `Math.floor(cents / 100) * 100` — round down to nearest dollar |
| `'quarter'` | `Math.floor(cents / 25) * 25` — round down to nearest $0.25 |
| `'exact'` | `Math.floor(amountCents * ratio[0] / ratio[1])` — pay to the penny, still floored |

**Note:** Colorado Division of Gaming Rule 23 rounds UP per 30-2306(4). This is a jurisdictional variant; our simulator always rounds DOWN. The rounding direction is not configurable.

### Bet Sizing Warnings

The advisor should warn when bet amounts cause rounding losses:

- Place 6/8 not in multiples of $6: "Your $5 Place 6 bet pays $5.83 → rounded to $5. Bet $6 to get the full $7 payout."
- Place 5/9 not in multiples of $5: "Your $3 Place 5 bet pays $4.20 → rounded to $4. Bet $5 for the full $7 payout."
- Odds bets that don't produce whole payouts.

---

## 2F. Statistical Validation Suite

The craps equivalent of the Hold'em simulator's `phase4-realistic-sim.test.ts`. This is the proof that the engine is mathematically correct.

### Test 1: Dice Distribution (Chi-Squared)

Run 1,000,000 rolls. For each of the 36 die-pair outcomes (1,1 through 6,6):
- Expected frequency: 1,000,000 / 36 ≈ 27,778.
- Chi-squared statistic across all 36 bins.
- **Pass criterion:** p-value > 0.01 (fail to reject uniformity at 1% significance).

Also validate each die independently:
- 1,000,000 rolls × 2 dice = 2,000,000 individual die values.
- Each face (1–6) expected ~333,333 times.
- Chi-squared across 6 bins per die.

### Test 2: House Edge Convergence

For each bet type, simulate N resolved bets and verify the actual house edge converges to the theoretical value.

| Bet Type | Expected House Edge | N (resolved bets) | Tolerance (±) |
|----------|--------------------|--------------------|---------------|
| Pass Line | 1.414% | 1,000,000 | 0.05% |
| Don't Pass (ties counted) | 1.364% | 1,000,000 | 0.05% |
| Pass Odds (any point) | 0.000% | 500,000 | 0.10% |
| Place 6 | 1.515% | 500,000 | 0.10% |
| Place 8 | 1.515% | 500,000 | 0.10% |
| Place 5 | 4.000% | 500,000 | 0.10% |
| Place 4 | 6.667% | 500,000 | 0.15% |
| Buy 4 (vig on win) | 1.667% | 500,000 | 0.10% |
| Buy 4 (vig on bet) | 4.762% | 500,000 | 0.15% |
| Lay 4 (vig on win) | 2.439% | 500,000 | 0.10% |
| Field (2:1/3:1) | 2.778% | 1,000,000 | 0.10% |
| Field (2:1/2:1) | 5.556% | 1,000,000 | 0.10% |
| Hard 6 | 9.091% | 500,000 | 0.20% |
| Hard 8 | 9.091% | 500,000 | 0.20% |
| Hard 4 | 11.111% | 500,000 | 0.20% |
| Hard 10 | 11.111% | 500,000 | 0.20% |
| Any 7 | 16.667% | 1,000,000 | 0.20% |
| Any Craps | 11.111% | 1,000,000 | 0.20% |
| Aces | 13.889% | 1,000,000 | 0.30% |
| Boxcars | 13.889% | 1,000,000 | 0.30% |
| Yo | 11.111% | 1,000,000 | 0.20% |
| Big 6 | 9.091% | 500,000 | 0.20% |

### Test 3: Come Bet Lifecycle

Simulate 100,000 Come bets and verify:
- ~22.22% win on first roll (8/36 for naturals: 7 or 11).
- ~11.11% lose on first roll (4/36 for craps: 2, 3, 12).
- ~66.67% establish a Come Point (24/36 for point numbers).
- Of those that establish a point, verify resolution rates match expected:
  - Come Point 4/10: 33.33% win rate (3 ways vs. 6 ways for 7).
  - Come Point 5/9: 40.00% win rate (4 ways vs. 6 ways).
  - Come Point 6/8: 45.45% win rate (5 ways vs. 6 ways).

### Test 4: Seven-Out Cascade

Simulate 10,000 seven-out events, each with a full complement of active bets:
- Pass Line + Odds: all lose.
- Don't Pass + Odds: all win.
- 3 established Come bets + Odds: all lose.
- 2 established Don't Come bets + Odds: all win.
- 1 pending Come bet: wins (7 = natural).
- Place 6 and Place 8 (working): both lose.
- Hard 6 (working): loses.
- Field: loses.
- Any 7: wins.
- Verify net settlement equals exact expected amount for every single scenario.

### Test 5: Payout Precision

Verify payout calculations for edge cases:
- $6 Place 6 → pays exactly $7.00 (700 cents).
- $5 Place 6 → pays $5.83 → rounds to $5.00 (500 cents) with dollar rounding.
- $30 Pass Odds on 5 → pays exactly $45.00 (3:2).
- $25 Buy 4 with vig-on-win → wins $50 gross, vig $2.50 rounds to $3, net $47. (Verify rounding direction.)
- $10 Don't Pass Odds on 4 → pays exactly $5.00 (1:2).

---

## Configuration File (`craps.config.ts`)

```typescript
export default {
  // ─── Table & Seating ─────────────────────────────────────────
  table: {
    maxPlayers: 8,
    heroPosition: 0,
  },

  // ─── Stake Levels ────────────────────────────────────────────
  stakes: [
    { level: 1, name: 'Low Roller',  minBet: 5,   maxBet: 500,   defaultBankroll: 200   },
    { level: 2, name: 'Standard',    minBet: 10,  maxBet: 2000,  defaultBankroll: 500   },
    { level: 3, name: 'Mid Stakes',  minBet: 25,  maxBet: 5000,  defaultBankroll: 2000  },
    { level: 4, name: 'High Roller', minBet: 100, maxBet: 10000, defaultBankroll: 5000  },
    { level: 5, name: 'Whale',       minBet: 500, maxBet: 50000, defaultBankroll: 25000 },
  ],
  defaultStakeLevel: 2,

  // ─── Payout Tables ───────────────────────────────────────────
  // All ratios as [numerator, denominator]
  payouts: {
    passLine:   { win: [1, 1] },
    dontPass:   { win: [1, 1] },
    come:       { win: [1, 1] },
    dontCome:   { win: [1, 1] },
    passOdds:   { 4: [2,1], 5: [3,2], 6: [6,5], 8: [6,5], 9: [3,2], 10: [2,1] },
    dontOdds:   { 4: [1,2], 5: [2,3], 6: [5,6], 8: [5,6], 9: [2,3], 10: [1,2] },
    place:      { 4: [9,5], 5: [7,5], 6: [7,6], 8: [7,6], 9: [7,5], 10: [9,5] },
    buy:        { 4: [2,1], 5: [3,2], 6: [6,5], 8: [6,5], 9: [3,2], 10: [2,1] },
    lay:        { 4: [1,2], 5: [2,3], 6: [5,6], 8: [5,6], 9: [2,3], 10: [1,2] },
    field:      { 2: [2,1], 3: [1,1], 4: [1,1], 9: [1,1], 10: [1,1], 11: [1,1], 12: [3,1] },
    hardway:    { 4: [7,1], 6: [9,1], 8: [9,1], 10: [7,1] },
    any7:       { win: [4,1] },
    anyCraps:   { win: [7,1] },
    aces:       { win: [30,1] },
    boxcars:    { win: [30,1] },
    aceDeuce:   { win: [15,1] },
    yo:         { win: [15,1] },
    big6:       { win: [1,1] },
    big8:       { win: [1,1] },
    horn:       { 2: [30,1], 3: [15,1], 11: [15,1], 12: [30,1] },
    ce:         { craps: [3,1], eleven: [7,1] },
  },

  // ─── House Edge Reference (for validation & advisor) ─────────
  houseEdges: {
    passLine:       0.01414,
    dontPass:       0.01364,
    come:           0.01414,
    dontCome:       0.01364,
    passOdds:       0.0,
    dontOdds:       0.0,
    place6:         0.01515,
    place8:         0.01515,
    place5:         0.04000,
    place9:         0.04000,
    place4:         0.06667,
    place10:        0.06667,
    buy4VigOnWin:   0.01667,
    buy10VigOnWin:  0.01667,
    field2x3x:      0.02778,
    field2x2x:      0.05556,
    hard6:          0.09091,
    hard8:          0.09091,
    hard4:          0.11111,
    hard10:         0.11111,
    any7:           0.16667,
    anyCraps:       0.11111,
    aces:           0.13889,
    boxcars:        0.13889,
    aceDeuce:       0.11111,
    yo:             0.11111,
    big6:           0.09091,
    big8:           0.09091,
  },

  // ─── Odds Multiples ──────────────────────────────────────────
  oddsMultiples: {
    '1x':     { 4: 1, 5: 1, 6: 1, 8: 1, 9: 1, 10: 1 },
    '2x':     { 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2 },
    '3-4-5x': { 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3 },
    '5x':     { 4: 5, 5: 5, 6: 5, 8: 5, 9: 5, 10: 5 },
    '10x':    { 4: 10, 5: 10, 6: 10, 8: 10, 9: 10, 10: 10 },
    '20x':    { 4: 20, 5: 20, 6: 20, 8: 20, 9: 20, 10: 20 },
    '100x':   { 4: 100, 5: 100, 6: 100, 8: 100, 9: 100, 10: 100 },
  },

  // ─── Bot Strategies ──────────────────────────────────────────
  botStrategies: [
    { name: 'Conservative Carl',   system: 'pass_max_odds' },
    { name: 'Don\'t Debbie',       system: 'dont_pass_lay' },
    { name: 'Iron Cross Irene',    system: 'iron_cross' },
    { name: 'Martingale Mike',     system: 'martingale' },
    { name: 'Regression Rick',     system: 'regression' },
    { name: 'Press Patricia',      system: 'press' },
    { name: 'Prop Bet Pete',       system: 'props_only' },
    { name: 'Three-Point Molly',   system: 'three_point' },
  ],

  // ─── Default Table Rules ─────────────────────────────────────
  defaultTableRules: {
    oddsMultiple: '3-4-5x' as const,
    fieldTwelvePayout: 3 as const,      // 3:1 (US default); MBS uses 2:1
    buyVigTiming: 'on_win' as const,    // 'on_bet' | 'on_win'. Default: vig on win only.
    hardwaysOnComeOut: false,           // OFF by default per MBS 3.17
    payoutRounding: 'dollar' as const,  // 'dollar' | 'quarter' | 'exact'
  },

  // ─── Animation & UX ──────────────────────────────────────────
  animation: {
    diceRollDuration: 1500,
    payoutDelay: 300,
    betweenRollsPause: 1000,
    autoRollSpeeds: [500, 1000, 2000, 5000],
    sevenOutPause: 2500,
  },

  // ─── Stats ────────────────────────────────────────────────────
  stats: {
    rollHistorySize: 200,
    bankrollHistorySize: 500,
    hotShooterThreshold: 15,
  },

  // ─── Persistence ──────────────────────────────────────────────
  storage: {
    localStorageKey: 'craps-simulator-session',
  },
}
```

---

## Acceptance Criteria

- Dice engine produces statistically uniform results verified by chi-squared test (p > 0.01 on 1M+ rolls).
- Every bet type resolves at its mathematically correct house edge (±tolerance) over 1M+ resolved bets.
- Come bet lifecycle tracks correctly: placement → point establishment → resolution.
- Pending Come bet on a seven-out correctly WINS while established Come bets LOSE.
- Seven-out correctly resolves ALL active bets in one cascade.
- Puck state transitions correctly between COME_OUT and POINT_PHASE.
- Payout rounding matches configured table rules.
- Integer-cent arithmetic prevents floating-point payout errors.
- Vig calculation correct for both "on bet" and "on win" timing.
- Game state machine has no dead states or infinite loops.
- All bet validation rules enforced (timing, sizing, bankroll).
- isWorking flag respected: OFF bets skip resolution entirely.
