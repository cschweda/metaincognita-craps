# Craps Simulator — Doc 04: Phase 4 — Bot Co-Bettors & Betting Systems

## Goal

Add bot co-bettors who use real betting strategies and systems. Unlike the Hold'em simulator (where bots are opponents), craps bots are fellow bettors sharing the same table. Their role is educational: the hero watches their bankrolls grow or shrink based on different systems, seeing the long-run math play out.

## Design Philosophy

Each bot uses a specific, named betting system that real craps players use. The simulator shows their bets on the table, tracks their bankroll over time, and lets the hero compare their own results against the bots' results. The teaching moment: every system converges to the house edge over time. "Systems" don't beat the math — they just change the variance curve.

---

## 4A. Bot Betting System Personas

### Conservative Carl — Pass + Max Odds

The mathematically optimal right-side strategy. Minimum Pass Line bet + maximum free odds.

**Algorithm:**
1. Come-out: Place $MIN on Pass Line.
2. After point established: Add max odds behind Pass Line.
3. After point resolved (win or seven-out): repeat from step 1.
4. No other bets. Ever.

**Expected behavior:**
- Combined house edge with 3-4-5× odds: ~0.37%.
- Steady, boring play. Small swings. Bankroll erodes very slowly.
- Rarely busts in a normal session. The control group.

---

### Don't Debbie — Don't Pass + Lay Odds

The "dark side" optimal strategy. Slightly better theoretical EV than Pass, but psychologically painful (many small wins, occasional big losses).

**Algorithm:**
1. Come-out: Place $MIN on Don't Pass.
2. After point established: Lay max odds.
3. After resolution: repeat.

**Expected behavior:**
- Combined edge: ~0.27% with max lay odds.
- Wins more often than Carl (7 comes before the point more often than not), but wins less per win.
- Loses bigger when the point does hit (odds laid are larger than odds taken).
- Anti-social — betting against the shooter. The simulator can note this in the comparison panel.

---

### Iron Cross Irene — Place 5, 6, 8 + Field

The "Iron Cross" — covers every number except 7. Wins on every single roll except the one that kills you.

**Algorithm:**
1. After point established: Place $6 on 6, $6 on 8, $5 on 5.
2. Place $5 on Field.
3. On any win: collect payout. Re-place Field (one-roll).
4. On 7: lose Place 5, 6, 8 (all three). Field also loses.
5. After seven-out: wait for new point, then re-establish.

**Expected behavior:**
- Wins on 30 of 36 possible outcomes (83.3% win rate per roll). Looks amazing.
- But the 6 losses from a 7 are devastating — lose all three Place bets plus Field.
- Bankroll graph shows long slow climbs punctuated by sharp drops. Deceptively profitable-looking until the seven-out.
- Teaching moment: "You won 83% of your rolls but still lost money. The 7 takes more than it gives back."

**Combined edge calculation (per 36 rolls at default US Field 2:1/3:1):**

| Bet | Amount | Resolutions/36 rolls | Wagered/36 | Expected Loss/36 |
|-----|--------|---------------------|------------|-----------------|
| Field ($5) | $5 | 36 (every roll) | $180 | $5.00 (2.78%) |
| Place 5 ($5) | $5 | 10 (4 wins + 6 losses) | $50 | $2.00 (4.00%) |
| Place 6 ($6) | $6 | 11 (5 wins + 6 losses) | $66 | $1.00 (1.52%) |
| Place 8 ($6) | $6 | 11 (5 wins + 6 losses) | $66 | $1.00 (1.52%) |
| **Total** | **$22/roll** | — | **$362** | **$9.00** |

**Combined edge = $9.00 / $362 = 2.49% (US Field 2:1/3:1).**
With MBS Field (2:1/2:1, 5.56% edge): Field loss = $10.01/36 rolls → total $14.01 / $362 = **3.87%**.

The ~3.9% figure applies only with the MBS Field payout. With the US default (2:1/3:1), the combined edge is ~2.5%. Both are far worse than Pass + max odds (~0.37%). The bot comparison dashboard should display the combined edge for the active table rules.

---

### Martingale Mike — Pass Line, Double After Loss

The classic doubling system. Every gambler's first "guaranteed" strategy. Guaranteed to fail.

**Algorithm:**
1. Come-out: Place $MIN on Pass Line.
2. If Pass Line wins: reset to $MIN.
3. If Pass Line loses: double the bet for the next Pass Line.
4. Continue doubling after each loss until a win resets to $MIN.
5. **Cap:** If next doubled bet exceeds table maximum or remaining bankroll, either:
   - (a) Bet the remaining bankroll (suicide shove), OR
   - (b) Reset to $MIN and accept the loss (configurable — default: reset).

**Expected behavior:**
- Per-resolved-bet house edge: still 1.414%. Martingale doesn't change the edge.
- Short sessions: looks profitable. Many small wins ($MIN per win).
- Long sessions: one bad streak requires exponential bet sizes. A 7-loss streak on a $10 minimum needs $1,280 to continue. A 10-loss streak needs $10,240.
- Bust probability increases rapidly with session length.
- Teaching moment: "Mike won 47 of 50 decisions but the 3 losses cost more than all 47 wins combined."

**Martingale progression table (for $10 minimum):**

| Loss # | Next Bet | Cumulative Loss |
|--------|----------|-----------------|
| 1 | $20 | $10 |
| 2 | $40 | $30 |
| 3 | $80 | $70 |
| 4 | $160 | $150 |
| 5 | $320 | $310 |
| 6 | $640 | $630 |
| 7 | $1,280 | $1,270 |
| 8 | $2,560 | $2,550 |

Table max of $2,000 kills the progression at loss #7. Mike resets and eats a $1,270 loss.

---

### Regression Rick — Place 6+8, Regress After First Win

Start big, lock in a profit, then play with house money.

**Algorithm:**
1. After point established: Place $12 on 6 and $12 on 8 (2-unit bets).
2. After first hit (either 6 or 8): Collect $14 payout. Regress both bets to $6 (1 unit).
3. Continue at $6 each until seven-out.
4. After seven-out: wait for new point, restart at $12 each.

**Expected behavior:**
- After the first hit, Rick has locked in a $2 profit ($14 payout − $12 original excess). The remaining $12 in bets is "house money."
- Per-bet edge: still 1.52% on each Place 6/8 bet.
- Lower variance than Patricia (below) because the regression limits exposure.
- Bankroll curve: choppy small gains with periodic drops on seven-outs.

---

### Press Patricia — Place 6+8, Press After Wins

The opposite of Rick. Start small, ride the hot roll.

**Algorithm:**
1. After point established: Place $6 on 6 and $6 on 8.
2. After a hit: "Press" the winning bet — add the $7 payout back to the bet, increasing it to $12. (Or full press: double the bet.)
3. Continue pressing after each win.
4. After seven-out: lose the accumulated pressed bets. Reset.

**Press schedule (full press):**

| Hit # | Bet Size | Payout | Action |
|-------|----------|--------|--------|
| Start | $6 | — | Initial |
| 1st | $6 → $12 | $7 (keep $1, press $6) | Half press |
| 2nd | $12 → $24 | $14 (keep $2, press $12) | Full press |
| 3rd | $24 → $48 | $28 (keep $4, press $24) | Full press |

**Expected behavior:**
- On a hot roll (10+ numbers before seven-out): Patricia's bets balloon to huge amounts. Massive payouts.
- On a cold roll (quick seven-out): Patricia loses small ($6 per bet).
- Very high variance. Bankroll curve looks like a seismograph.
- Teaching moment: "Patricia made $480 on one hot roll, then lost it all over the next 5 cold shooters."

---

### Prop Bet Pete — Horn + Hardways + Any Craps

The canary in the coal mine. Every bet Pete makes is a sucker bet.

**Algorithm:**
1. Every roll: Place $1 on each hardway (Hard 4, 6, 8, 10) = $4.
2. Every roll: Place $4 Horn bet ($1 each on 2, 3, 11, 12).
3. Every roll: Place $1 Any Craps.
4. Total action per roll: $9.

**Expected behavior:**
- Pete is risking $9/roll at a combined 10–13% house edge.
- Expected loss: ~$1/roll.
- At 100 rolls/hour, Pete loses ~$100/hour.
- Pete will bust faster than anyone else. Often spectacularly.
- Occasional big payouts (30:1 on snake eyes) create dopamine spikes, but net is catastrophic.
- Teaching moment: The comparison panel should highlight Pete's stats relentlessly. "Pete has wagered $2,700 and lost $892 (33%). His expected loss was $324. He's running 2.7× worse than expected because variance amplifies bad edges."

---

### Three-Point Molly — Pass + 2 Come + Max Odds

The classic textbook grinding strategy. Always have three numbers working with maximum odds.

**Algorithm:**
1. Come-out: Place $MIN on Pass Line.
2. After point established: Add max odds. Place $MIN Come bet.
3. After Come bet establishes a Come Point: Add max Come Odds. Place another $MIN Come bet.
4. Maintain up to 3 active line bets (1 Pass + 2 Come), each with max odds.
5. When a Come bet wins (Come Point hit), replace it with a new Come bet on the next roll.
6. After seven-out: Pass + both Come bets (if established) lose. Start fresh.

**Expected behavior:**
- Always has 3 numbers working (after first couple of rolls).
- Combined edge: ~0.37% (same as Pass + Odds, since Come is mathematically identical to Pass).
- Moderate variance. More numbers working = more wins per roll, but also more exposure on seven-out.
- On seven-out: loses 3 bets + 3 odds bets simultaneously. Can be a big hit.
- On a hot roll: collecting on 3 numbers regularly. Feels great.
- Teaching moment: "Molly has the same edge as Carl but with higher variance. More action, more fun, same math."

---

## 4B. Bot Decision Engine

### Interface

```typescript
interface BotStrategy {
  name: string
  system: string
  decide(gameState: GameState, botState: BotState, tableRules: TableRules): BetAction[]
}

interface BotState {
  bankroll: number          // cents
  activeBets: ActiveBet[]   // this bot's active bets
  consecutiveLosses: number // for Martingale
  currentUnit: number       // current bet unit (may scale for Martingale)
  pressLevel: number        // for Press Patricia — how many times pressed
}

interface BetAction {
  action: 'place' | 'remove' | 'increase' | 'toggle_working'
  betType: BetType
  amount: number            // cents
  pointNumber?: number      // for Place/Come with specific number
}
```

### Decision Timing

Bots make their decisions during the BETWEEN_ROLLS phase:
1. Game enters BETWEEN_ROLLS.
2. Hero adjusts bets (manual or via Same Bet).
3. Each bot's `decide()` function runs.
4. Bot bet actions animate briefly (chips appear on table).
5. Roll button becomes active.

Bot decisions are deterministic — no randomness. Each strategy is a mechanical system. This is intentional: the point is to show that mechanical systems don't beat the house, regardless of their logic.

### Edge Cases

**Martingale Mike — table limit hit:**
```typescript
if (nextBet > tableRules.maxBet) {
  // Option A (default): Reset to minimum, accept loss
  nextBet = tableRules.minBet
  consecutiveLosses = 0
  // Option B: Bet remaining bankroll
  // nextBet = Math.min(bankroll, tableRules.maxBet)
}
```

**Iron Cross Irene — partial seven-out recovery:**
When Irene seven-outs, she loses all Place bets but her bankroll may still be positive from accumulated Field + Place wins. She waits for the next point to re-establish.

**Three-Point Molly — Come bet on a natural:**
When Molly's Come bet wins immediately (natural 7/11), she re-places a Come bet on the next roll to maintain 3 numbers working. But if the natural was a 7, that's also a seven-out and everything resets. This interaction is correct and must be handled.

---

## 4C. Bot Bankroll Display

### Per-Bot Rail Display

Each bot has a compact display along the table rail:

```
Conservative Carl
Pass + Max Odds
$487 (+$37)  ▆▆▇▇▆▇▇▇
```

Components:
- **Name** (bold).
- **Strategy label** (smaller, gray).
- **Current bankroll** + session profit/loss in green/red.
- **Mini sparkline** showing bankroll trend over last 100 rolls.

### Bust-Out Display

When a bot's bankroll hits zero:

```
Prop Bet Pete
Horn + Hardways
$0 (−$500) BUSTED
Survived: 187 rolls
```

The bust badge stays visible for the rest of the session. The bot no longer places bets. Their seat shows as empty/grayed on the table.

---

## 4D. System Comparison Dashboard

Accessible from the stats panel's "Compare" tab (see Doc 05) and also as a post-session summary.

### Comparison Table

| Player | System | Bankroll | P&L | Wagered | Actual Edge | Rolls Survived | Status |
|--------|--------|----------|-----|---------|-------------|---------------|--------|
| Hero | Custom | $487 | −$13 | $2,400 | 0.54% | 312 | Active |
| Conservative Carl | Pass+Odds | $491 | −$9 | $2,800 | 0.32% | 312 | Active |
| Don't Debbie | DP+Lay | $514 | +$14 | $2,600 | −0.54% | 312 | Active |
| Iron Cross Irene | Iron Cross | $423 | −$77 | $4,200 | 1.83% | 312 | Active |
| Martingale Mike | Martingale | $530 | +$30 | $1,800 | −1.67% | 312 | Active |
| Prop Bet Pete | Center Bets | $0 | −$500 | $3,400 | 14.71% | 187 | BUSTED |

### Bankroll History Chart

All bankroll curves overlaid on one chart:
- X-axis: Roll number (0 to current).
- Y-axis: Bankroll amount.
- Each player is a different color.
- Hero's line is thicker/brighter.
- Busted players' lines flatline at $0 from their bust point.

This chart is the most powerful teaching tool in the entire simulator. Seeing Pete's line crater while Carl's gently drifts is worth a semester of probability class.

### Auto-Generated Insights

After sufficient data (50+ rolls), the dashboard generates contextual insights:

- "Prop Bet Pete has been busted for 125 rolls. He lost 3× as much as you on similar total action."
- "Conservative Carl and you have nearly identical results. His slightly lower edge comes from always taking max odds."
- "Martingale Mike is currently up $200, but his next loss will cost $320. He's one bad streak from losing everything."
- "Iron Cross Irene has won on 83% of rolls but is still down $77. The seven-out penalty is that severe."
- "Don't Debbie is the only player in the green. Dark side play has lower variance and a slightly better edge."
- "Three-Point Molly has wagered more than anyone ($5,200) but her edge is the same as Carl's (0.37%). More action, same math."

---

## Acceptance Criteria

- All 8 bot strategies execute correctly per their defined systems.
- Conservative Carl never places anything except Pass Line + max odds.
- Martingale Mike correctly doubles after losses and handles table-limit caps.
- Iron Cross Irene places all 4 bets (Place 5, 6, 8 + Field) and re-places Field every roll.
- Three-Point Molly maintains 3 active line bets with odds after ramp-up.
- Press Patricia correctly presses after wins with correct amounts.
- Prop Bet Pete places center bets every single roll.
- Bot bankrolls track accurately across all rolls.
- Bust-out detection works — busted bots stop placing bets.
- Bot bets are visible on the table in their designated zones.
- System comparison dashboard renders with correct metrics.
- Bankroll history chart shows all players overlaid.
- Auto-generated insights are contextually accurate and non-trivial.
- No bot strategy produces a positive expected value over 100K+ simulated rolls (by construction).
