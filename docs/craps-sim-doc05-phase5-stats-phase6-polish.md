# Craps Simulator — Doc 05: Phase 5 — Stats Panel & Strategy Advisor + Phase 6 — Polish

## Phase 5 Goal

Add a comprehensive real-time stats/advisor panel. Three tabs: **Live Roll** (current roll analysis), **Hero Stats** (session performance), and **Compare** (hero vs. bots). The panel teaches the player the math behind every decision.

---

## 5A. Panel Layout

- Right sidebar (~300px), dark glass-morphism card, always visible.
- Three tabs: **Live Roll** | **My Stats** | **Compare**
- Collapsible on narrow screens (<1280px → slides in from right as overlay).
- Each section below maps to a tab.

---

## 5B. Live Roll Tab (real-time, updates every roll)

### Active Bets Summary

List of all hero bets currently on the table:

```
Active Bets (5)                    Total at Risk: $86
─────────────────────────────────────────────────
Pass Line        $10  (Point: 6)        1.41% edge
  + Odds          $50  (5× on 6)        0.00% edge
Place 8          $6   working            1.52% edge
Place 5          $5   working            4.00% edge
Hard 6           $5   working            9.09% edge
Field            $10  (one-roll)         2.78% edge
```

- Each bet shows: type, amount, point number (if applicable), working status, house edge.
- **Color-coded risk indicator:** Green for <2% edge, yellow for 2–5%, orange for 5–10%, red for >10%.
- **Total at risk** and **weighted average house edge** across all active bets.

### Expected Value Display

For each active bet:
```
Pass Line $10:     EV = −$0.14 per decision
Pass Odds $50:     EV = $0.00 per decision
Place 8 $6:        EV = −$0.09 per decision
Hard 6 $5:         EV = −$0.45 per decision
```

**"Cost of fun" metric:**
```
Your current bet spread costs you $0.68 per decision.
At ~4 decisions per hour on line bets, that's ~$2.72/hour expected loss.
```

This is the metric that makes craps approachable. "I'm paying $2.72 per hour for entertainment" feels different from "the house edge is 1.41%."

### Probability Dashboard

After point is established:
```
Point: 6
Probability of making the point: 45.45% (5 ways vs. 6 ways for 7)
Expected rolls to resolve: 3.27 (36/11)
```

Expected rolls to resolve vary by point: 6/8 → 3.27, 5/9 → 3.6, 4/10 → 4.0.

If hero has Come bets:
```
Numbers working: 5, 6, 8 (via Pass + 2 Come)
Probability of hitting at least one before seven-out: 71.4%
Expected rolls before seven-out: 6.0 (point-phase rolls only; average total shooter length ≈ 8.53)
```

### Roll History

Last 20 rolls in a compact strip:
```
7✓ 4 9 6✓ 3 7× | 8→ 5 11✓ 6 4 9✓ 5✓ 7× | 6→ 10 8 6✓ ...
```

Legend: ✓ = won a bet, × = seven-out/craps loss, → = point established, plain = intermediate roll.

**Mini frequency chart:** Bar chart showing how many times each number (2–12) has appeared this shooter session. No predictive value, but satisfies curiosity and illustrates the distribution converging to expected frequencies.

### Gambler's Fallacy Guard

If hero hasn't seen a 7 in 15+ rolls, the advisor does NOT say "7 is due." Instead:
```
⚠ Reminder: Each roll is independent. The probability of rolling 7 is
always 16.67%, regardless of previous rolls. This shooter has been
going 22 rolls — impressive, but it doesn't change the next roll's odds.
```

### Smart Bet Recommendations

Context-aware suggestions based on current game state:

**Odds reminders:**
```
💡 You have a Pass Line bet with no odds on it. Max odds (5× on this 6-point)
   is the only zero-edge bet in the casino. Consider adding $50 in odds.
```

**Sucker bet warnings:**
```
⚠ You placed a Big 6 bet ($6, house edge 9.09%).
   Place 6 bet pays 7:6 (edge 1.52%) — same bet, 6× cheaper.
   Consider switching.
```

```
⚠ You have $5 on Any 7 — house edge 16.67%, the worst bet on the table.
   Expected loss: $0.83 per roll. Over 100 rolls, that's −$83.
```

**Bet sizing warnings:**
```
💡 Your $5 Place 6 bet will pay $5.83, rounded down to $5.
   Bet $6 instead to get the full $7 payout (saves $0.83 per hit).
```

**Strategic observations:**
```
💡 You're in the point phase with just a Pass Line bet.
   Adding 2 Come bets with odds (Three-Point Molly strategy) gives you
   3 numbers working. More action, same low edge.
```

---

## 5C. My Stats Tab (hero session performance)

### Core Session Stats

```
Session: 312 rolls  |  Points: 24 est. / 11 made (45.8%) / 13 missed
Total Wagered: $4,200   |   Net: −$47 (−1.12%)
Theoretical Edge (your bet mix): −1.83%   |   You're running slightly better than expected.
```

### Per-Bet-Type Breakdown Table

This is the single most educational feature in the simulator.

| Bet Type | Placed | Won | Lost | Push | Net P&L | Your Edge | Expected Edge | Verdict |
|----------|--------|-----|------|------|---------|-----------|--------------|---------|
| Pass Line | 45 | 22 | 23 | 0 | −$10 | 1.11% | 1.41% | ✓ Solid |
| Pass Odds | 34 | 16 | 18 | 0 | −$30 | 0.88% | 0.00% | ⚠ Variance |
| Come | 18 | 9 | 9 | 0 | $0 | 0.00% | 1.41% | ✓ Running hot |
| Place 6 | 28 | 14 | 14 | 0 | +$12 | — | 1.52% | ✓ |
| Place 8 | 26 | 12 | 14 | 0 | −$8 | 1.58% | 1.52% | ✓ Normal |
| Field | 40 | 22 | 18 | 0 | +$6 | — | 2.78% | ✓ Running hot |
| Hard 6 | 15 | 1 | 14 | 0 | −$56 | 37.3% | 9.09% | ✗ Ouch |
| Hard 8 | 12 | 1 | 11 | 0 | −$46 | 38.3% | 9.09% | ✗ |
| Any 7 | 8 | 1 | 7 | 0 | −$31 | 38.8% | 16.67% | ✗ Stop |

**The Hard 6 row tells a story:** 15 bets, 1 win, $56 in losses. That's the reality of hardway bets over a session. Even with the correct 9.09% theoretical edge, variance makes it *feel* even worse in small samples.

**The Any 7 row:** 8 bets, 1 win, $31 down. The advisor should flag this: "You've placed 8 Any 7 bets this session for a net loss of $31. At this rate, you're losing $3.88 per bet — more than double the theoretical $0.83/bet. Consider dropping this bet entirely."

### Bankroll Chart

Line chart:
- X-axis: Roll number (0 → current).
- Y-axis: Bankroll ($).
- **Actual bankroll:** Hero's thick colored line.
- **Theoretical bankroll:** Dashed gray line showing starting bankroll − (total wagered × weighted average edge). This is the "expected" line.
- The gap between actual and theoretical shows variance.
- Tooltip on hover: shows exact bankroll and net P&L at that roll.

### Longest Shooter Stats

```
Longest shooter this session: 28 rolls (You!)
Average shooter length: 8.5 rolls
Your average as shooter: 9.2 rolls (24 come-outs)
```

### Session Persistence

All stats saved to localStorage under the configured key. Survives page refresh. "New Session" button resets everything and records a session summary.

---

## 5D. Compare Tab (hero vs. bots)

### Comparison Leaderboard

Sorted by net P&L (best to worst):

| # | Player | System | Bankroll | P&L | Wagered | Edge | Status |
|---|--------|--------|----------|-----|---------|------|--------|
| 1 | Don't Debbie | DP+Lay | $514 | +$14 | $2,600 | −0.54% | ▲ |
| 2 | Martingale Mike | Martingale | $530 | +$30 | $1,800 | −1.67% | ▲ ⚠ |
| 3 | Conservative Carl | Pass+Odds | $491 | −$9 | $2,800 | 0.32% | ▼ |
| 4 | Hero | Custom | $487 | −$13 | $2,400 | 0.54% | ▼ |
| 5 | Three-Point Molly | 3-Point | $462 | −$38 | $5,200 | 0.73% | ▼ |
| 6 | Iron Cross Irene | Iron Cross | $423 | −$77 | $4,200 | 1.83% | ▼▼ |
| 7 | Regression Rick | Regress 6+8 | $445 | −$55 | $3,100 | 1.77% | ▼ |
| 8 | Prop Bet Pete | Center Bets | $0 | −$500 | $3,400 | 14.71% | BUST |

Note the ⚠ on Martingale Mike: he's up, but the warning indicates his next loss doubles. The dashboard should explain: "Mike is up $30, but his current bet is $80 after 3 consecutive losses. If he loses again, his next bet will be $160."

### Overlaid Bankroll Chart

Same as the single-player bankroll chart, but with ALL players overlaid:
- Hero: thick bright line.
- Bots: thinner lines, each a different color.
- Busted players: flatline at $0.
- Legend below the chart with player names + colors.

### Auto-Generated Insights

Generated after 50+ rolls. Examples (mix and match based on actual data):

**Pete's demise:**
> "Prop Bet Pete busted on roll 187 after wagering $3,400 on center bets. His actual edge of 14.71% is in line with the theoretical 11–13% for proposition bets — but with this much action, the math was never going to be kind."

**Martingale danger:**
> "Martingale Mike is up $30, but don't be fooled. He's in the middle of a 3-loss streak and his next bet is $80. If he loses 4 more times in a row (probability: ~4.5%), he'll hit the table max and eat a $1,270 loss. That's the Martingale trap."

**Carl vs. Molly:**
> "Conservative Carl and Three-Point Molly have the same theoretical edge (0.37%), but Molly has wagered nearly twice as much. More action means more variance — Molly's swings are bigger in both directions."

**Iron Cross illusion:**
> "Iron Cross Irene has won on 247 of 312 rolls (79.2%). She still lost $77. Winning frequently and winning profitably are very different things."

**Hero coaching:**
> "Your heaviest losses this session came from hardway and proposition bets ($133 combined). Your line bets and Place 6/8 are performing well. Consider dropping the center bets and your hourly cost drops from $2.72 to $0.85."

---

## Phase 6 Goal

Final visual pass — smooth animations, casino feel, and quality-of-life features.

---

## 6A. Dice Roll Animation

See Doc 01 for animation phases (launch, tumble, bounce, settle). Implementation details:

- **CSS 3D transforms:** `transform-style: preserve-3d` on the die container. Each face positioned with rotateX/rotateY/translateZ.
- **Independent die rotation:** Die 1 and Die 2 rotate at different rates on different axes. Random rotation offsets ensure they don't look synchronized.
- **Pre-calculated final state:** The target rotation angles are computed from the roll result BEFORE animation starts. The animation interpolates from a random starting orientation to the known final orientation.
- **Easing:** Cubic bezier for the tumble phase (fast start, gradual slowdown), spring easing for the settle (slight overshoot and dampen).
- **Shadow:** Each die casts a shadow on the felt that moves with it during the animation.

---

## 6B. Chip Movement Animations

### Bet Placement
- When hero taps a betting area: chip flies from the chip tray to the table position. Quick arc trajectory (200ms).
- Sound-like visual feedback: brief glow pulse on the chip when it lands.

### Payout Collection
- Winning chips slide from the table to the hero's chip rack. Staggered if multiple chips (50ms between each). Rail grows visibly.

### Loss Collection
- Losing chips dim to 50% opacity and slide toward the center of the table (where the dealer would collect them). Then fade out.

### Come Bet Travel
- When a Come bet establishes a point: the chip on the COME area slides smoothly to the point number box. This mirrors what the real dealer does, and it's visually educational — the player can SEE their bet move to the number.

---

## 6C. Puck Animation

- **Point established:** Puck flips from black (OFF) to white (ON) with a 3D rotation, then slides to the point number box. Duration: 500ms.
- **Point hit / new come-out:** Puck slides from the number box to the OFF position, flips from white to black. Duration: 500ms.
- **Seven-out:** Same as above but preceded by a brief red flash on the puck before it moves.

---

## 6D. Roll Result Callout

- Large text appears in the center of the table: the total number in a gold circle, with the stickman call below.
- Entrance: scale up from 0 to 100% with slight bounce (300ms).
- Hold: 1.5 seconds.
- Exit: fade to 0 opacity (300ms).
- **Special variants:**
  - Natural (7/11 on come-out): Gold burst background, green text.
  - Craps (2/3/12 on come-out): Red burst background.
  - Seven-out: Red background with "SEVEN OUT" in large bold text, 2.5s hold.
  - Point hit: Gold background with confetti-style particle burst.

---

## 6E. Winning/Losing Bet Highlights

- **Winning bets:** Bet area glows gold for 1 second. Chips pulse brightly.
- **Losing bets:** Bet area dims. Chips fade to gray before sliding to center.
- **Pushes:** Bet area flashes white once.
- **Seven-out cascade:** ALL losing bets flash red simultaneously, then resolve sequentially. The visual impact of a seven-out should feel weighty — everything goes red for a moment.

---

## 6F. Come Bet Travel Animation

Critical for understanding. When a Come bet's first roll establishes a point:

1. The chip in the COME area lifts slightly (scale up 110%, shadow darkens).
2. Chip slides along a smooth path to the corresponding number box.
3. Chip settles into position in the number box.
4. Duration: 600ms total.
5. A small "COME → 9" label briefly appears to explain what happened.

---

## 6G. Hot Shooter Detection

After 15+ rolls without a seven-out (configurable threshold):
- Table edge glows with a subtle warm/gold pulse.
- "HOT SHOOTER" badge appears near the shooter indicator.
- Roll count displayed: "22 rolls and counting."
- Not predictive. Not superstitious. Just fun — and a visual reminder of how long rolls create (temporary) profits.

After 25+ rolls: badge upgrades to "ON FIRE 🔥" (the one acceptable emoji).

---

## 6H. Seven-Out Drama

The most dramatic moment in craps. The animation sequence:

1. Dice settle on 7. Total displays.
2. **Beat pause** (500ms silence — no immediate callout).
3. "SEVEN OUT!" callout appears in red, large, bold.
4. All losing bets flash red simultaneously (500ms).
5. "Line away! Pay the don'ts!" appears below.
6. Individual bet resolutions animate sequentially (300ms each).
7. After all resolutions: "New shooter" transition begins.
8. Total seven-out sequence: ~4 seconds.

---

## 6I. Settings Menu

Accessible from a gear icon in the top-right:

- **Animation speed:** Slow / Normal / Fast / Instant (maps to duration multipliers: 2×, 1×, 0.5×, 0×).
- **Auto-roll:** Toggle + speed selector.
- **Stickman calls:** Toggle on/off.
- **Advisor panel:** Toggle visible/hidden.
- **Sound effects:** Future enhancement (not in v1 — text only). Toggle placeholder.
- **Hot shooter threshold:** 10/15/20/25 rolls.
- **Hero always shoots:** Toggle.

---

## 6J. Responsive Design

### 1280px+ (Desktop)
- Full table on left (~70%). Stats panel on right (~30%).
- All betting areas visible. Full chip tray.

### 768px–1279px (Tablet)
- Full-width table. Stats panel as slide-in drawer from right.
- Quick-bet buttons remain fixed at bottom.
- Chip tray compresses to 4 chips.

### Below 768px (Mobile)
- Table scales to fit width. Some layout compression:
  - Center proposition area collapses to a "Props" button that opens a modal.
  - Number boxes may need to be tappable as a row rather than individual visual boxes.
- Stats panel: full-screen overlay when opened.
- Chip tray and Roll button fixed at bottom.
- Minimum tap target: 44px.

---

## Acceptance Criteria (Phase 5)

- All three stats tabs render and switch correctly.
- Live Roll tab updates in real-time after each roll.
- EV calculations correct for all bet types.
- Probability dashboard shows correct conditional probabilities for the current point.
- Per-bet-type breakdown tracks accurately across all bet types over the session.
- Bankroll chart renders with theoretical overlay line.
- Bot comparison table updates after each roll and sorts by P&L.
- Bankroll overlay chart shows all players with correct colors and legend.
- Auto-generated insights trigger after 50+ rolls and are contextually accurate.
- Gambler's fallacy guard triggers after 15+ rolls without a 7.
- Bet sizing warnings trigger for improper Place bet amounts.
- Hero session stats persist across page refreshes via localStorage.
- "New Session" button resets all stats and bankrolls.
- Panel doesn't overlap table on 1280px+ screens.

## Acceptance Criteria (Phase 6)

- Dice animation plays smoothly with independent die rotation and correct final faces.
- Chip placement animation: tray to table (200ms arc).
- Chip payout animation: table to rail (staggered, 50ms per chip).
- Come bet travel animation: COME area slides to number box (600ms).
- Puck animation: flip + slide between ON/OFF states (500ms).
- Roll result callout: scale-in, hold, fade-out with variant styling.
- Seven-out drama sequence: pause → red flash → sequential resolution (~4s total).
- Hot shooter detection triggers at configurable threshold.
- Settings menu allows animation speed, auto-roll, stickman call toggles.
- Responsive: desktop sidebar, tablet drawer, mobile overlay.
- 100+ consecutive rolls play smoothly without visual glitches or state corruption.
