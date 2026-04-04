# Craps Simulator — Doc 12: Use Cases

## User Personas

### Persona 1: The Complete Beginner

**"Alex"** has never played craps. Walked past the craps table in a casino once and was intimidated by the complexity, the shouting, and the dense layout. Wants to learn the game in a zero-pressure environment before trying a real table. Doesn't know what "the point" means, doesn't know what odds are, has no concept of house edge.

### Persona 2: The Casual Player

**"Jordan"** has played craps a few times in Vegas. Knows Pass Line and maybe Place 6/8. Has never placed a Come bet or added odds. Doesn't understand the difference between Place and Buy bets. Tends to bet the Field because "it wins on a lot of numbers." Wants to improve their game and lose less money.

### Persona 3: The Strategy-Minded Player

**"Sam"** plays craps regularly, uses Pass + odds, and has read a few articles about house edge. Wants to understand exactly how much each bet costs, compare their actual results against theoretical expectations, and evaluate whether Iron Cross or Three-Point Molly is the better grinding strategy. Interested in the math, not just the experience.

### Persona 4: The Systems Skeptic

**"Riley"** has a friend who swears by the Martingale system and claims they "always win at craps." Riley suspects this is nonsense but can't articulate why. Wants to see, visually and statistically, why betting systems don't beat the house edge. Wants ammunition for the next argument.

---

## Use Cases

### UC-01: First-Time Setup and Play

**Persona:** Alex (Beginner)
**Precondition:** First visit to the simulator. No localStorage session.

**Flow:**
1. Alex opens the URL. Lands on the Setup page (`/`).
2. Enters name "Alex" in the hero name field.
3. Sees 5 stake level cards. Selects "Low Roller" ($5 min, $200 bankroll) because it feels safest.
4. Leaves Table Rules collapsed (defaults are fine — Alex doesn't know what any of them mean yet).
5. Sets bots to 3 (default). Doesn't change strategy assignments.
6. Clicks "Start Game."
7. Arrives at the table (`/table`). Sees the craps layout, chip tray, and "Roll" button.
8. The stats panel's Live Roll tab shows "Place a bet to begin."
9. Alex clicks the $5 chip, then clicks the Pass Line area on the table. A chip appears.
10. Clicks "Roll." Dice animate. Roll is 8.
11. Stickman call: "Point is eight. Mark it." Puck slides to 8.
12. The advisor says: "You have a Pass Line bet with no odds. Add max odds — it's the only bet in the casino with zero house edge."
13. Alex clicks "Add Odds" → "Max" button. $15 odds chip appears behind the Pass Line bet.
14. Rolls again. Roll is 8. "Winner! Eight! Pay the line!"
15. Chips animate to Alex's rail. Green text: "+$5 (Pass) +$18 (Odds)."
16. Alex plays 20 more rolls, getting comfortable with the rhythm.

**Acceptance criteria:**
- Setup page loads with sensible defaults.
- First bet placement is intuitive (select chip → click zone).
- Advisor provides helpful guidance for a beginner.
- Puck animation clearly shows the point being established.
- Payout animation clearly shows winnings.

---

### UC-02: Learning What Odds Bets Are

**Persona:** Jordan (Casual)
**Precondition:** Jordan has played the simulator before. Has a saved session.

**Flow:**
1. Jordan opens the URL. Lands on `/table` (resumed session).
2. Places a $10 Pass Line bet. Rolls. Point is 5.
3. The advisor says: "Point is 5. Probability of making it: 40%. Add odds for zero house edge."
4. Jordan clicks "Add Odds" but hesitates. Clicks the (i) icon next to the odds button.
5. A tooltip explains: "Odds bets pay at true mathematical odds with zero house edge. On a point of 5, odds pay 3:2. A $20 odds bet wins $30 if the point hits. This is the best bet in the casino."
6. Jordan adds 4× odds ($40).
7. The Live Roll tab updates: "Total at risk: $50. EV per roll: −$0.04. Your odds bet has 0% house edge."
8. Roll is 5. Pass Line pays $10. Odds pay $60. Total: +$70.
9. Jordan checks the My Stats tab. Sees Pass Odds: 6 times placed, net P&L +$80, actual edge 0.0%. Compares to Hard 8: 3 times placed, net P&L −$15, actual edge 33%.
10. Jordan realizes the odds bets are where the real value is.

**Acceptance criteria:**
- Session resume from localStorage works.
- Advisor explains odds bets in beginner-friendly language.
- Tooltip/info panel provides detailed explanation on demand.
- Per-bet-type breakdown in My Stats shows the stark contrast between odds and proposition bets.

---

### UC-03: Comparing Iron Cross vs. Pass + Odds

**Persona:** Sam (Strategy-Minded)
**Precondition:** New session. Sam wants a controlled comparison.

**Flow:**
1. Sam opens Setup. Selects "Standard" stakes ($10 min, $500 bankroll).
2. Sets bots to 2: Conservative Carl (Pass + Max Odds) and Iron Cross Irene (Place 5,6,8 + Field).
3. Starts the game.
4. Sam plays their own strategy: Pass Line + max odds (same as Conservative Carl, to control for luck).
5. After 100 rolls, Sam opens the Compare tab.
6. Sees three bankroll curves overlaid on one chart:
   - Sam: $487 (−$13, 0.54% actual edge on $2,400 wagered)
   - Conservative Carl: $491 (−$9, 0.32% actual edge on $2,800 wagered)
   - Iron Cross Irene: $422 (−$78, 2.1% actual edge on $3,700 wagered)
7. The insight panel says: "Iron Cross Irene wagered 54% more than you but lost 6× as much. Her higher total action at a higher combined edge compounds quickly."
8. Sam switches to the My Stats tab and examines the per-bet-type breakdown. Sees that Pass Odds has 0.0% actual edge while Place 5 is running at 4.2%.
9. Sam now has concrete data for the next strategy discussion.

**Acceptance criteria:**
- Bot selection on setup page works with specific strategy assignment.
- Compare tab shows overlaid bankroll curves.
- Insight panel generates meaningful comparative statements.
- Per-bet-type breakdown shows accurate actual vs. theoretical edge.
- The data tells a clear story: lower-edge bets win over time.

---

### UC-04: Watching Martingale Mike Go Bust

**Persona:** Riley (Systems Skeptic)
**Precondition:** Riley specifically wants to see betting systems fail.

**Flow:**
1. Riley opens Setup. Selects "Standard" stakes.
2. Sets bots to 4: Conservative Carl, Martingale Mike, Prop Bet Pete, Three-Point Molly.
3. Starts the game.
4. Riley plays conservatively (Pass + odds) and watches the bots.
5. After 50 rolls, Martingale Mike is up $80. The Compare tab shows his bankroll climbing steadily. Riley's skeptical — "See? Martingale works."
6. At roll 73, Martingale Mike hits a 6-loss streak. His bets escalate: $10 → $20 → $40 → $80 → $160 → $320. He's down $310 in six rolls.
7. His bankroll is $170. His next required bet is $320 (which exceeds his bankroll). The simulator shows: "Martingale Mike: bankroll insufficient for next double ($320 needed, $170 remaining). Betting remaining $170."
8. He loses. Bankroll: $0. "BUSTED — 73 rolls. Total lost: $500."
9. Meanwhile, Conservative Carl has $492 (−$8). Three-Point Molly has $476 (−$24). Prop Bet Pete busted at roll 41.
10. The Compare tab shows all four curves. Mike's looks like a staircase that falls off a cliff. Carl's is a gentle downward slope.
11. The insight panel: "Martingale Mike won 22 of his 24 resolved bets (91.7% win rate) but lost $500. His system produced many small wins and one catastrophic loss. Conservative Carl won 11 of 23 bets (47.8%) but lost only $8. Win rate is not the same as profitability."
12. Riley screenshots this for the next argument.

**Acceptance criteria:**
- Martingale Mike's doubling logic executes correctly, including the bankroll-insufficient edge case.
- Bust-out is detected and displayed prominently ("BUSTED" with stats).
- The Compare tab's overlaid bankroll chart visually demonstrates the Martingale cliff.
- Insight panel generates the "win rate ≠ profitability" observation.
- Prop Bet Pete busts earlier than other bots (expected, given 10-16% house edges).

---

### UC-05: Identifying Sucker Bets via the Advisor

**Persona:** Jordan (Casual)
**Precondition:** Active session.

**Flow:**
1. Jordan sees the hardways area in the center of the table. Clicks $5 chip → Hard 8.
2. The advisor immediately responds: "Hard 8 pays 9:1 with a 9.09% house edge. That's 6× worse than a Place 8 bet (1.52%). For the same $5, Place 8 gives you the same win condition at far lower cost."
3. Jordan places a $5 Big 6 bet.
4. The advisor: "Big 6 pays even money (1:1) with a 9.09% house edge. Place 6 pays 7:6 with a 1.52% edge. Same bet — 6 before 7 — but Place 6 pays more. You're paying 6× more house edge for a worse payout."
5. Jordan removes Big 6 and places Place 6 ($6) instead.
6. After 20 more rolls, Jordan checks My Stats. The per-bet-type breakdown shows Hard 8: 4 times placed, 0 wins, −$20. Place 6: 8 times placed, 3 wins, +$9.
7. The contrast in the table is the lesson.

**Acceptance criteria:**
- Advisor triggers on sucker bet placement (Big 6, Big 8, Any 7, hardways, propositions).
- Advisor compares sucker bet to the better alternative with specific numbers.
- Player can act on the advice (remove bet, place alternative).
- Per-bet-type breakdown confirms the advisor's warning with real results.

---

### UC-06: Playing Through a Seven-Out

**Persona:** Any
**Precondition:** Active session, point established, multiple bets on the table.

**Flow:**
1. Player has: $10 Pass Line with point on 6, $30 Pass odds, $10 Come bet on 9 with $30 odds, $6 Place 8, $5 Hard 6.
2. Total at risk: $91 across 5 bet positions.
3. Roll is 7. Seven-out.
4. **Resolution cascade (in order):**
   - Pass Line $10: LOSE (−$10)
   - Pass Odds $30: LOSE (−$30)
   - Come on 9 $10: LOSE (−$10)
   - Come Odds on 9 $30: LOSE (−$30)
   - Place 8 $6: LOSE (−$6)
   - Hard 6 $5: LOSE (−$5)
5. Total loss: −$91. All bets swept in one roll.
6. Stickman call: "Seven out! Line away! Pay the don'ts. New shooter."
7. Animation: All losing bets flash red. Chips slide to center and fade. Loss amounts float up.
8. Brief dramatic pause (2.5 seconds).
9. "New Shooter" transition. Dice pass to next player.
10. The stats panel updates. Roll history shows the seven-out. Bankroll chart dips sharply.

**Acceptance criteria:**
- Every active bet resolves correctly on seven-out.
- Resolution order matches the documented order (line bets → odds → come bets → place → field → hardways → props → big 6/8).
- Payout animation shows each resolution individually.
- Total loss displayed as net result badge.
- Shooter rotation occurs after seven-out.
- Dramatic pause before transition feels appropriate (not too long, not too short).
- The emotional weight of the seven-out is conveyed visually — this is the most dramatic moment in craps.

---

### UC-07: Using the "Same Bet" Feature

**Persona:** Sam (Strategy-Minded)
**Precondition:** Active session, point just resolved (Pass Line won).

**Flow:**
1. Sam had $10 Pass Line. Point was 8. Point hit. Sam won $10.
2. Puck goes OFF. New come-out phase.
3. Sam clicks "Same Bet."
4. $10 Pass Line bet is auto-placed. (Odds are NOT auto-placed — they can only be placed after a point.)
5. Sam rolls. Point is 5.
6. The "Same Odds" prompt appears: "Add odds? Last time: 3× ($30)." Quick buttons: 1×, 2×, 3×, Max.
7. Sam clicks "3×." $40 odds (4× on a 5-point with 3-4-5× rules, but Sam had used 3× = $30 last time on an 8-point, which equals $40 at 4× for a 5-point to keep the win amount consistent at $60).
8. Wait — this gets complicated. The "Same Odds" should replicate the dollar amount of odds, not the multiplier, since the multiplier meaning changes with the point number. $30 odds on 8 (pays 6:5 = $36 win) vs. $30 odds on 5 (pays 3:2 = $45 win). Both are valid. Just replicate the dollar amount.

**Acceptance criteria:**
- "Same Bet" re-places all bets valid for the current phase at their previous amounts.
- Come-out phase: Pass Line (or Don't Pass) re-placed. Odds deferred until point.
- "Same Odds" prompt appears after point establishment, offering previous dollar amount.
- Dollar amount is replicated, not multiplier (since multiplier meaning varies by point).
- If previous bet amount exceeds current bankroll, "Same Bet" adjusts to max affordable.

---

### UC-08: Session Persistence on Refresh

**Persona:** Any
**Precondition:** Active session on `/table`.

**Flow:**
1. Player has active bets, 47 rolls into a session, 3 bots playing.
2. Player accidentally hits F5 (refresh).
3. Page reloads. Store hydrates from localStorage.
4. Game resumes exactly where it was: same phase, same point, same active bets, same bot bankrolls, same session stats.
5. Player continues playing seamlessly.

**Alternate flow — corrupted localStorage:**
1. Player has an old session from a previous version with a different store schema.
2. Store detects invalid data shape on hydration.
3. Store resets to defaults. Player is redirected to Setup (`/`).
4. No crash, no white screen, no console errors.

**Acceptance criteria:**
- Full game state round-trips through localStorage (JSON.stringify → JSON.parse).
- Refresh on `/table` resumes seamlessly.
- Navigating to `/` after refresh shows confirmation dialog if session exists.
- Corrupted or schema-mismatched localStorage triggers graceful reset.
- Bot bankroll histories survive refresh.

---

### UC-09: Exploring the Full Bet Catalog

**Persona:** Sam (Strategy-Minded)
**Precondition:** Active session, point established.

**Flow:**
1. Sam wants to try every bet type available. Point is 6.
2. Places: Pass Line (already active), Pass Odds, Come bet, Place 5, Place 8, Place 9, Buy 4 (vig on win), Field, Hard 6, Hard 8, Any Craps.
3. The Live Roll tab shows all 11 active bets with individual EV per roll, color-coded by risk level (green/yellow/red).
4. Total at risk: $127. Total EV per roll: −$0.89.
5. "Cost of fun" display: "Your current bet spread costs $0.89 per roll."
6. Sam rolls. Roll is 4.
7. Resolution: Field wins (+$5, even money on 4). Buy 4 wins (+$10 at 2:1, minus vig). All other bets: no action.
8. Sam checks the Live Roll tab. Each bet's status is updated: Field resolved (won), Buy 4 resolved (won), others still active.
9. Over the next 10 rolls, various bets resolve. Sam watches the per-bet-type breakdown populate with real data.

**Acceptance criteria:**
- All bet types can be placed in the appropriate game phase.
- Multiple simultaneous bets resolve independently on each roll.
- The Live Roll tab accurately reflects every active bet.
- Color-coded risk indicator corresponds to house edge brackets.
- Bets that resolved show win/loss; bets still active show "Active."

---

### UC-10: Returning to Setup and Starting a New Game

**Persona:** Any
**Precondition:** Active session on `/table`.

**Flow:**
1. Player clicks "New Game" in the top bar.
2. Confirmation dialog: "Leave the table? Your current session will end."
3. Player confirms.
4. localStorage session is cleared.
5. Player is navigated to Setup (`/`).
6. Setup page loads with fresh defaults (not the previous session's config).
7. Player configures a new game and starts.

**Alternate flow — cancel:**
1. Player clicks "New Game."
2. Confirmation dialog appears.
3. Player clicks "Cancel."
4. Dialog closes. Game continues. No state changes.

**Acceptance criteria:**
- Confirmation dialog prevents accidental session loss.
- Cancel returns to game with no side effects.
- Confirm clears localStorage and navigates to `/`.
- New setup page shows defaults, not previous session config.

---

## Summary of Use Cases

| UC | Title | Primary Persona | Phase Required |
|----|-------|----------------|----------------|
| UC-01 | First-Time Setup and Play | Beginner | Phase 3 |
| UC-02 | Learning What Odds Bets Are | Casual | Phase 5 |
| UC-03 | Comparing Iron Cross vs. Pass + Odds | Strategy | Phase 5 |
| UC-04 | Watching Martingale Mike Go Bust | Skeptic | Phase 4 |
| UC-05 | Identifying Sucker Bets via Advisor | Casual | Phase 5 |
| UC-06 | Playing Through a Seven-Out | Any | Phase 3 |
| UC-07 | Using the "Same Bet" Feature | Strategy | Phase 3 |
| UC-08 | Session Persistence on Refresh | Any | Phase 3 |
| UC-09 | Exploring the Full Bet Catalog | Strategy | Phase 3 |
| UC-10 | Returning to Setup | Any | Phase 3 |
