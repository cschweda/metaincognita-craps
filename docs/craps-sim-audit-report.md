# Craps Simulator — Design Document Audit Report

## Summary

Audited all 6 documents (Doc 00–05) for statistical accuracy, internal consistency, and implementation gaps. Found **3 bugs**, **4 gaps**, and **3 minor issues**. All house edge figures for standalone bets verified correct from first principles. The core domain model and bet catalog are solid.

---

## BUGS (Must Fix)

### BUG 1: Doc 02 — Vig-on-bet payout calculated on wrong base amount

**Location:** Doc 02, section 2E, "Vig on bet (charged at placement)" code block.

**Problem:** The code computes `effectiveBet = betAmount - vigAmount` and then calculates payout on `effectiveBet` at true odds. This is incorrect. The vig is a separate fee — payout should be calculated at true odds on the **full bet amount**, not on (bet minus vig).

**Current (wrong):**
```typescript
const vigAmount = Math.ceil(betAmount * 0.05)
const effectiveBet = betAmount - vigAmount  // WRONG
// Payout calculated on effectiveBet at true odds
```

**Correct:**
```typescript
const vigAmount = Math.ceil(betAmount * 0.05)
const totalCost = betAmount + vigAmount  // vig is ADDITIONAL, not deducted
// Payout calculated on betAmount at true odds (the full wager)
// If win: player receives betAmount + (betAmount × trueOdds) 
// If lose: player loses totalCost (bet + vig paid upfront)
```

**Impact:** With the current code, Buy 4/10 vig-on-bet produces a 5.0% house edge instead of the documented 4.76% (which matches the Wizard of Odds reference).

---

### BUG 2: Doc 02 — Vig rounding direction contradicts house edge reference values

**Location:** Doc 02, section 2E, both vig code blocks use `Math.ceil` (round UP).

**Problem:** The house edge figures in the reference table (and in Doc 00) assume vig rounds DOWN (player-favorable), which is standard in most casinos. Using `Math.ceil` for vig calculation rounds UP against the player, producing different house edges.

**Example:** Buy 5/9 vig-on-win. $20 bet wins $30. Vig = 5% of $30 = $1.50.
- `Math.ceil` → $2 vig → net win $28 → house edge 4.00%.
- `Math.floor` → $1 vig → net win $29 → house edge 2.00%.

The Doc 00 reference table says Buy 5/9 vig-on-win = 2.00%, which assumes rounding DOWN.

**Fix:** Change `Math.ceil` to `Math.floor` for vig calculations. Or make vig rounding direction a table rule (configurable), and ensure the house edge reference values match the configured rounding.

---

### BUG 3: Doc 05 — Wrong "expected rolls to resolve" for point of 6

**Location:** Doc 05, section 5B, Probability Dashboard example.

**Problem:** The doc says "Expected rolls to resolve this point: 3.6 (for a 6-point)." The correct value for a 6-point is 36/11 ≈ **3.27 rolls**. The 3.6 figure is for a 5/9 point (36/10 = 3.6).

**Correct values:**
- Point 4/10: 36/9 = 4.0 rolls.
- Point 5/9: 36/10 = 3.6 rolls.
- Point 6/8: 36/11 ≈ 3.27 rolls.

---

## GAPS (Should Address)

### GAP 1: Doc 05 — "Cost of fun" metric doesn't account for resolution frequency

**Location:** Doc 05, section 5B, Expected Value Display.

**Problem:** The advisor displays EV "per decision" for each bet, then combines them into a "cost per decision" total. But different bet types resolve at wildly different rates — a Field bet resolves every roll, a Pass Line bet resolves roughly every 3.4 rolls, and a Hardway bet sits for many rolls. Summing per-decision EVs across bet types and treating them as equivalent is misleading.

**Example:** A $10 Field bet at 2.78% edge costs $0.278 per roll × 100 rolls/hour = **$27.80/hour**. A $10 Pass Line bet at 1.41% costs $0.141 per decision × ~30 decisions/hour = **$4.24/hour**. The Pass Line costs 6× less per hour despite similar per-decision EV.

**Fix:** The advisor should compute **expected hourly loss** (or per-roll loss) for each bet type, accounting for resolution frequency:
- Line bets: resolve on ~12/36 rolls (come-out) or ~(ways+6)/36 rolls (point phase).
- Place bets: resolve on ~11/36 rolls (6/8) or ~10/36 (5/9) or ~9/36 (4/10).
- One-roll bets: resolve every roll.
- Hardways: resolve on ~(1+ways-1+6)/36 rolls per roll.

### GAP 2: Doc 04 — Iron Cross "~3.9% combined edge" is ambiguous and possibly wrong

**Location:** Doc 04, Conservative Carl section (referenced), Iron Cross Irene.

**Problem:** The "~3.9% combined edge" for Iron Cross doesn't specify what metric it's using. Per-dollar-at-risk? Per-dollar-resolved? Per-roll? The expected loss per roll for Iron Cross ($6 Place 6, $6 Place 8, $5 Place 5, $5 Field) is approximately $0.25/roll, which on $22 at risk is ~1.1%/roll — not 3.9%.

The 3.9% might be the weighted average of individual bet edges by action, but that doesn't account for resolution frequencies being different for Field (every roll) vs Place (occasional rolls).

**Fix:** Replace the ambiguous percentage with a concrete "expected loss per roll" or "expected hourly loss at 100 rolls/hour" figure. This is more useful for comparison anyway.

### GAP 3: No specification for how the simulator handles multiple Come bets on the same number

**Location:** Not addressed anywhere.

**Problem:** What happens if the hero places a Come bet, it establishes a Come Point on 6, and then the hero places *another* Come bet, which also rolls a 6? Now there are two Come bets on the same number. This is legal in casinos. The simulator needs to:
1. Allow multiple Come bets on the same number.
2. Track them as separate ActiveBet entries (different IDs, possibly different odds amounts).
3. Resolve them independently (both win when 6 hits, both lose on seven-out).
4. Display them correctly on the table (stacked or side-by-side on the number box).

This also applies to Don't Come bets on the same number.

### GAP 4: No specification for the Pass Line bet during come-out when hero already has one

**Location:** Not addressed.

**Problem:** Can the hero increase their Pass Line bet during the come-out? In a real casino, you can add to your Pass Line bet before any come-out roll (but not after a point is established — that's the contract lock). The docs say "Placed: Before come-out roll only" but don't clarify whether the hero can *increase* an existing Pass Line during a come-out after a previous point was just made and a new come-out begins. The hero's prior Pass Line was just resolved — so they'd need to place a new one. This flow is implicit but should be explicit.

---

## MINOR ISSUES

### MINOR 1: Doc 00/Doc 02 — Place 6/8 house edge listed as both 1.52% and 1.515%

Doc 00's bet catalog says "1.52%" and Doc 02's validation table says "1.515%". The exact value is 1/66 = 1.51515...%. Both are acceptable roundings, but they should be consistent across documents. Recommend using 1.52% everywhere (standard convention).

### MINOR 2: Doc 05 — "Expected rolls before seven-out: 6.0" could be misread

The 6.0 figure (36/6) is the expected number of rolls before a 7 appears during point-phase. During come-out, a 7 is a natural, not a seven-out. The average total shooter length (including come-outs) is ~8.53 rolls. The doc should clarify this is "point-phase rolls until a 7 appears."

### MINOR 3: Doc 02 — Lay bet house edge calculation assumes specific vig treatment

The Lay bet house edges (2.44%, 3.23%, 4.00%) assume vig is charged upfront on the expected win amount. This is standard for Lay bets (unlike Buy bets where vig timing varies). The doc should note this explicitly so the implementation doesn't accidentally make Lay vig configurable in the same way Buy vig is.

---

## VERIFIED CORRECT

All of the following were independently verified from first principles using exact rational arithmetic:

| Item | Value | Status |
|------|-------|--------|
| Pass Line house edge | 1.414% (7/495) | ✅ |
| Don't Pass house edge (with ties) | 1.364% | ✅ |
| Don't Pass house edge (without ties) | 1.403% | ✅ |
| Place 4/10 | 6.667% | ✅ |
| Place 5/9 | 4.000% | ✅ |
| Place 6/8 | 1.515% | ✅ |
| Buy 4/10 vig-on-bet | 4.762% | ✅ |
| Buy 4/10 vig-on-win | 1.667% | ✅ |
| Lay 4/10 | 2.439% | ✅ |
| Lay 5/9 | 3.226% | ✅ |
| Lay 6/8 | 4.000% | ✅ |
| Field (2:1/3:1) | 2.778% | ✅ |
| Field (2:1/2:1) | 5.556% | ✅ |
| Hard 4/10 | 11.111% | ✅ |
| Hard 6/8 | 9.091% | ✅ |
| Any 7 | 16.667% | ✅ |
| Any Craps | 11.111% | ✅ |
| Aces/Boxcars | 13.889% | ✅ |
| Ace-Deuce/Yo | 11.111% | ✅ |
| Big 6/8 | 9.091% | ✅ |
| C&E | 11.111% | ✅ |
| Horn | 12.500% | ✅ |
| Dice probability table (36 outcomes) | All correct | ✅ |
| Come bet first-roll probabilities | 22.22% / 11.11% / 66.67% | ✅ |
| Come Point win rates (per point) | 33.33% / 40.00% / 45.45% | ✅ |
| 3-4-5× odds combined edge (Pass) | ~0.374% | ✅ |
| 3-4-5× odds combined edge (DP) | ~0.273% | ✅ |
| Pass Line EV per $10 | −$0.14 | ✅ |
| Seven-out cascade logic | All bet outcomes correct | ✅ |
| Don't Pass bar-12 vs bar-2 | Same edge (1.364%) | ✅ |
| Average shooter length | ~8.53 rolls | ✅ (Doc 03 says 8.5) |
