# Craps Simulator — Doc 10: Revision / Gap Analysis

## Purpose

This is a living document updated after each phase build. It tracks what deviated from the design, what gaps emerged, what was discovered during implementation, and what needs to be addressed in subsequent phases. Each phase gets its own section appended below.

---

## Pre-Build Gap Analysis (Design Phase)

The following gaps were identified during the design review and cross-validation process, before any code was written.

### GAP 1: "Cost of Fun" Metric — Resolution Frequency

**Status:** Open (not blocking)

**Issue:** The "cost of fun" metric in the stats panel (Doc 05) calculates EV per roll as `house_edge × bet_amount / average_rolls_to_resolve`. But this doesn't account for the fact that different bets resolve at different frequencies. A Pass Line bet with a point of 4 takes an average of 4.5 rolls to resolve, while a Field bet resolves every single roll. A $10 Pass Line bet and a $10 Field bet cost very different amounts per roll despite both being "$10 bets."

**Resolution:** The per-roll EV calculation needs to weight by resolution frequency. For multi-roll bets, use the expected number of rolls to resolution. For one-roll bets, the denominator is 1. This should be documented in the advisor's tooltip or info panel so the player understands why Place 6 ($10, 1.52% edge, resolves every ~3.27 relevant rolls) costs less per roll than Field ($10, 2.78% edge, resolves every roll).

**Assigned to:** Phase 5 (Stats Panel build).

### GAP 2: Iron Cross Combined Edge

**Status:** ✅ Resolved (Doc 04 updated)

**Issue:** Doc 04 states Iron Cross Irene's combined edge is "~3.9%" but doesn't show the concrete $/roll calculation.

**Resolution:** Full per-roll EV breakdown added to Doc 04. The ~3.9% figure applies only with MBS Field (2:1/2:1). With the US default Field (2:1/3:1), the combined edge is 2.49%. Doc 04 now contains the complete table showing resolutions per 36 rolls, wagered amounts, and expected loss for each component bet.

### GAP 3: Multiple Come Bets on the Same Number

**Status:** ✅ Resolved (rules defined below)

**Issue:** If a player has a Come bet that established a point on 6, and then places another Come bet, and the next roll is also 6 — what happens?

**Resolution:** Follow MBS convention — allow stacking. The concrete rules:

1. **Tracking:** Multiple Come bets on the same number are tracked independently via unique `ActiveBet.id` values, never by `pointNumber` alone. Each can have its own odds amount.
2. **Resolution order:** When the number hits, all Come bets on that number resolve simultaneously (all WIN). Each pays 1:1 independently. Each associated odds bet pays at its true-odds ratio independently.
3. **Seven-out:** All established Come bets lose simultaneously, regardless of how many share a number.
4. **Rendering:** Stacked Come bets on the same number display as a chip stack with a "×2" (or ×3, etc.) badge. Tapping/clicking the stack shows individual bets in a popover for odds management.
5. **Don't Come:** Same stacking rules apply. Multiple Don't Come bets can sit on the same number. Each is independent.
6. **Odds attachment:** When adding odds to a stacked Come bet, a disambiguation prompt appears: "Add odds to which Come bet on 6?" showing placement order and amounts. If all flat bets are the same amount, add odds to the oldest (FIFO).

**Assigned to:** Phase 2 (Bet Manager implementation), Phase 1 (rendering).

### GAP 4: Pass Line Re-Placement After Resolution

**Status:** Open (not blocking)

**Issue:** After a point is made (Pass Line wins), the game returns to come-out. The player needs to place a new Pass Line bet. The "same bet" button should auto-place the previous Pass Line amount. But what if the player had odds? Should the "same bet" button also auto-place odds? It can't — odds can only be placed after a point is established.

**Resolution:** The "same bet" button re-places all bets that are valid for the current game phase. On come-out, it places Pass Line (or Don't Pass) at the previous amount. Odds are not re-placed until a point is established, at which point a separate "same odds" prompt appears.

**Assigned to:** Phase 3 (Game Loop — "same bet" feature).

---

## Phase 1 — Post-Build Review

*To be completed after Phase 1 build.*

### What was built as designed:
- [ ] (fill in after build)

### What deviated from design:
- [ ] (fill in after build)

### New gaps discovered:
- [ ] (fill in after build)

### Carried forward to Phase 2:
- [ ] (fill in after build)

---

## Phase 2 — Post-Build Review

*To be completed after Phase 2 build.*

### What was built as designed:
- [ ] (fill in after build)

### What deviated from design:
- [ ] (fill in after build)

### New gaps discovered:
- [ ] (fill in after build)

### Test results:
- [ ] Chi-squared dice uniformity: PASS / FAIL
- [ ] House edge convergence (per bet type): PASS / FAIL
- [ ] Come bet lifecycle: PASS / FAIL
- [ ] Seven-out cascade: PASS / FAIL
- [ ] Payout precision: PASS / FAIL

### Carried forward to Phase 3:
- [ ] (fill in after build)

---

## Phase 3 — Post-Build Review

*To be completed after Phase 3 build.*

### What was built as designed:
- [ ] (fill in after build)

### What deviated from design:
- [ ] (fill in after build)

### New gaps discovered:
- [ ] (fill in after build)

### Carried forward to Phase 4:
- [ ] (fill in after build)

---

## Phase 4 — Post-Build Review

*To be completed after Phase 4 build.*

### What was built as designed:
- [ ] (fill in after build)

### What deviated from design:
- [ ] (fill in after build)

### New gaps discovered:
- [ ] (fill in after build)

### Bot strategy verification:
- [ ] Conservative Carl: Correct behavior over 10K+ rolls
- [ ] Don't Debbie: Correct behavior over 10K+ rolls
- [ ] Iron Cross Irene: Correct behavior over 10K+ rolls
- [ ] Martingale Mike: Doubling + bust-out correct
- [ ] Regression Rick: Regress-after-win correct
- [ ] Press Patricia: Press-after-win correct
- [ ] Prop Bet Pete: Center bets only, expected bust rate
- [ ] Three-Point Molly: 3 numbers working with odds correct

### Carried forward to Phase 5:
- [ ] (fill in after build)

---

## Phase 5 — Post-Build Review

*To be completed after Phase 5 build.*

---

## Phase 6 — Post-Build Review

*To be completed after Phase 6 build.*

---

## Bug Fixes Applied During Design Phase

These bugs were found during the statistical audit and cross-validation of Docs 00–05, before any code was written. They are documented here and have already been corrected in the relevant phase docs.

| Bug | Doc | Description | Fix | Status |
|-----|-----|-------------|-----|--------|
| BUG 1 | Doc 02 | Vig-on-bet code deducted vig from wager instead of adding it as a separate fee | Vig is an additional fee paid on top of the wager, not deducted from it | ✅ Fixed |
| BUG 2 | Doc 02 | Vig rounding used `Math.ceil` (favors player) | Changed to `Math.floor` (favors house, matching casino practice) | ✅ Fixed |
| BUG 3 | Doc 05 | Expected rolls for point of 6 stated as 3.6 | Corrected to 3.27 (36/11) | ✅ Fixed |

### Additions from Cross-Validation

| Addition | Source | Description | Status |
|----------|--------|-------------|--------|
| Horn High | MBS 3.4.15 | Added to BetType enum and bet catalog as a 5-unit bet | ✅ Added |
| Lay always working | MBS 3.4.11 | Lay bets are always ON including come-out | ✅ Added |
| Don't Pass/Come constraints | MBS 3.16.1 | Cannot replace or increase after point | ✅ Added |
| Buy vig refund | MBS 3.4.10.1 | Vig refunded if Buy bet is taken down | ✅ Added |
| Working/Off rewrite | MBS various | Complete rewrite with specific rule citations | ✅ Added |
| Canonical rules reference | — | MBS designated as canonical, Colorado as secondary | ✅ Added to Doc 00 |
