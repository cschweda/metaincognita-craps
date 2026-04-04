# Craps Simulator — Doc 03: Phase 3 — Game Loop & Hero Interaction

## Goal

Wire the dice engine, bet resolver, and puck state machine into a playable game loop. The hero can place bets, roll dice, watch resolutions, and play consecutive rolls/shooters.

---

## 3A. Game Loop

```
1. BETWEEN_ROLLS: Hero places/adjusts bets.
2. Hero clicks "Roll" (or "Shoot" when hero is the shooter).
3. RESOLVING: Dice animation plays.
4. Bet resolver runs. Payouts animate.
5. Puck updates if needed (point established, point hit, seven-out).
6. State transitions (stay in phase, new come-out, shooter change).
7. Return to BETWEEN_ROLLS.
```

### Loop Detail

**Step 1 — Bet Window:**
- All valid bet areas are active for placement/adjustment.
- Quick-bet buttons enabled for valid bets.
- Roll button is enabled and prominent.
- If auto-roll is ON, a countdown timer runs (configurable speed). Timer pauses if hero starts a bet action, resumes when they finish.

**Step 2 — Roll Trigger:**
- Hero clicks Roll/Shoot button. OR auto-roll timer fires.
- Immediately: lock all bet areas, disable Roll button, set `animating: true`.
- Generate the dice result (instantaneous — the result is known before animation starts).

**Step 3 — Dice Animation:**
- Animation plays (1.5s default — see Doc 01 for animation phases).
- Dice settle on final values. Total displays prominently.

**Step 4 — Resolution:**
- Bet resolver runs against all active bets.
- Resolution results queued for sequential display.
- Each resolution animates:
  - Winning bets: chips slide to hero rail, green +$X floats up.
  - Losing bets: chips fade toward center, red −$X floats up.
  - Pushes: chips pulse, stays in place.
- Stickman call displays (see 3D below).
- Net result badge appears: "+$85 on 3 bets" or "−$40 on 2 bets."

**Step 5 — State Update:**
- Puck updates if point established (slide to number), point hit (slide to OFF), or seven-out (slide to OFF).
- If seven-out: SEVEN_OUT state → dramatic pause → SHOOTER_CHANGE → brief handoff animation → COME_OUT.
- If point established: COME_OUT → POINT_PHASE.
- If point hit: POINT_PHASE → COME_OUT (same shooter).
- If intermediate roll: stay in POINT_PHASE.

**Step 6 — Bet Cleanup:**
- Resolved bets removed from the table.
- Come bets that established points: chip slides from COME area to number box.
- Bankrolls update (hero rail chip rack adjusts).
- Bot bankrolls update.
- `animating: false`.

**Step 7 — Return to Step 1.**

### Rapid Play Mode

Toggle that skips all animations:
- Dice result appears instantly (no tumble animation).
- Payouts resolve instantly (no chip sliding).
- State transitions instant.
- Stickman calls still display briefly (200ms).
- Useful for grinding sessions, bankroll testing, or data gathering.

### Auto-Roll Mode

Toggle with configurable speed (0.5s, 1s, 2s, 5s between rolls):
- Timer starts after resolution completes.
- If hero begins a bet action (clicks chip tray, hovers a bet area), timer pauses.
- Timer resumes when hero completes or cancels the action.
- Visual: countdown bar below the Roll button.
- **Auto-roll does NOT auto-place bets.** It only auto-rolls. The hero must manually manage bets between rolls. (Bots auto-place their bets per their strategy.)
- **"Same bet" shortcut:** After a resolved roll, a "Same Bet" button re-places the hero's previous bet configuration. Combine with auto-roll for steady grinding.

---

## 3B. Hero Bet Controls

### Chip Tray

Fixed at the bottom of the screen, below the table. Contains 4–5 chip denominations based on table stakes:

| Table Level | Available Chips |
|-------------|----------------|
| Low Roller ($5 min) | $1, $5, $25, $100 |
| Standard ($10 min) | $5, $25, $100, $500 |
| Mid Stakes ($25 min) | $5, $25, $100, $500 |
| High Roller ($100 min) | $25, $100, $500, $1,000 |
| Whale ($500 min) | $100, $500, $1,000, $5,000 |

- Tap a chip to select it (glows to indicate active selection).
- Tap a different chip to switch.
- Selected chip denomination is used for all subsequent bet placements until changed.

### Bet Placement Flow

1. **Select chip** from tray.
2. **Tap valid table area.** Chip appears on that area. Bet amount = chip denomination.
3. **Tap again to add.** Each additional tap adds one more chip of the selected denomination. Bet amount increments.
4. **Remove:** Right-click (desktop) or long-press (mobile) on a removable bet → bet is removed, chips return to rail.
5. **Toggle ON/OFF:** Tap the lammer indicator on a discretionary bet to toggle working status.

### Quick-Bet Buttons

Row of buttons below the chip tray:

| Button | Action | Available When |
|--------|--------|---------------|
| **Pass Line** | Place selected chip on Pass Line | COME_OUT only |
| **Come** | Place selected chip on Come | POINT_PHASE only |
| **Place 6** | Place selected chip on Place 6 | Any time (but OFF on come-out by default) |
| **Place 8** | Place selected chip on Place 8 | Any time |
| **Odds** | Opens odds sub-menu for any line bet that needs odds | After point established on a line bet |

**Odds sub-menu:** When hero has a Pass Line or Come bet with a point and no odds yet, the Odds button expands to show: 1×, 2×, 3×, Max. Tapping one places that amount of odds behind the relevant bet.

### Take Down Mode

A toggle button labeled "Take Down" switches the UI to removal mode:
- All removable bets pulse red (visual indicator).
- Tapping a pulsing bet removes it.
- Contract bets (locked) are grayed out and cannot be tapped.
- Tap "Take Down" again to exit removal mode.

### Roll/Shoot Button

Large, prominent button (centered below the table or in the bottom-right):
- Label: "SHOOT" when hero is the active shooter. "ROLL" when a bot is shooting (hero is just watching/betting).
- Disabled and dimmed during `animating: true`.
- Disabled when hero has no bets on the table (enforce at least one bet before rolling — or make this optional in settings).
- Keyboard shortcut: Spacebar.

### Same Bet Button

After a roll resolves, a "Same Bet" button appears that re-places the hero's exact bet configuration from the previous roll:
- Same bet types, same amounts, same odds.
- Skips bets that are no longer valid (e.g., Pass Line odds when puck is OFF).
- Useful for steady grinding: tap Same Bet → tap Roll.

---

## 3C. Payout Animation

### Winning Bets
- Chips on the winning bet area glow gold briefly.
- Payout chips slide from the table to the hero's chip rack along the bottom rail.
- Green text floats up from the bet area: "+$35" (or "+$7" etc.).
- Chip rack updates (new chips added, stack grows).

### Losing Bets
- Chips on the losing bet area dim and slide toward the center of the table (dealer collects).
- Red text floats up: "−$10".
- Chip rack updates (shrinks).

### Pushes
- Chips pulse once and remain in place.
- Gray text: "Push" (no amount change).

### Net Result Badge

After all individual resolutions animate, a summary badge appears near the center:
- Green badge: "+$85 on 3 bets" (net positive).
- Red badge: "−$40 on 2 bets" (net negative).
- Mixed: "+$35 on 5 bets (2 won, 3 lost)" (shows net and breakdown).
- Badge fades after 2 seconds.

### Animation Timing

| Event | Duration | Notes |
|-------|----------|-------|
| Dice tumble | 1,500ms | Pre-calculated result, cosmetic animation |
| Individual bet resolution | 300ms each | Staggered sequentially |
| Puck movement | 500ms | Slide animation |
| Net result badge | 2,000ms display | Then fades |
| Seven-out dramatic pause | 2,500ms | Before shooter change |
| Between-rolls gap | 1,000ms | Minimum before Roll is re-enabled |

All animations promise-based and gated by `animating` flag. No game state changes until animations complete.

---

## 3D. Stickman / Dealer Calls

Text callouts that appear above the table, styled as stickman/dealer announcements. These add casino atmosphere and serve as immediate roll interpretation for beginners.

### Come-Out Roll Calls

| Roll | Stickman Call |
|------|---------------|
| 7 | "Seven! Winner! Pay the line!" |
| 11 | "Yo eleven! Winner!" |
| 2 | "Aces! Craps! Line away!" |
| 3 | "Ace-deuce! Craps! Line away!" |
| 12 | "Boxcars! Craps!" + "Don't pass bar — push on the twelve." |
| 4 | "Four! Point is four. Mark it." |
| 5 | "Five! No field five. Point is five." |
| 6 | "Six! Point is six. Mark it." |
| 8 | "Eight! Point is eight. Mark it." |
| 9 | "Nina! Point is nine." |
| 10 | "Ten! Point is ten. Mark it." |

### Point Phase Calls

| Roll | Stickman Call |
|------|---------------|
| Point hit | "[Number]! Winner! Pay the line! Coming out." |
| 7 | "Seven out! Line away! Pay the don'ts. Last call for the shooter." |
| Hard hit | "Hard [number]! Pay the hardways!" |
| Easy (w/ hardway bet active) | "[Number] came easy. Take the hard [number]." |
| Field win (2) | "Aces! Field double!" |
| Field win (12) | "Boxcars! Field triple!" (if 3:1 payout) |
| Field win (other) | "Field! Pay the field!" |
| Yo | "Yo! Eleven!" |
| Any craps hit | "Craps! Pay the any craps!" |

### Call Display

- Appears as a styled text overlay above the center of the table.
- Large font, casino-style typography.
- Fades in quickly (200ms), holds for 1.5s, fades out.
- Multiple calls can stack if multiple bets resolve (e.g., "Hard eight! Pay the hardways!" followed by "Field! Pay the field!").

---

## 3E. Shooter Rotation

### How Shooting Works

- **Hero starts as shooter #1.**
- Hero rolls dice by clicking Shoot.
- When hero sevens out:
  - "Seven out!" call displays.
  - Brief pause (2.5s).
  - "New Shooter" transition: dice slide to next player position.
  - Next bot becomes the nominal shooter.

### Bot Shooters

- Bot shooters roll automatically with a configurable delay (1–3s between rolls).
- The hero's controls change:
  - Roll button label changes from "SHOOT" to "ROLL" (hero is no longer the shooter).
  - Hero can still place/adjust bets between bot rolls.
  - The game loop is identical — hero bets, bot rolls, bets resolve.
- When the bot shooter sevens out, dice pass to the next player.
- Eventually the rotation returns to the hero. "Your turn to shoot!" indicator appears.

### Shooter Rotation Cycle

Players are seated in a clockwise order. Dice pass clockwise after a seven-out:
```
Hero → Bot 1 → Bot 2 → ... → Bot N → Hero → ...
```

If a bot is busted (bankroll = 0), they're skipped in the rotation.

### Hero-Only Shooter Option

Setup toggle: "Hero always shoots." When enabled:
- Dice never pass. Hero is always the shooter.
- Seven-out still triggers a come-out reset, but no shooter change animation.
- Simpler for beginners who don't want to wait through bot shooter turns.

---

## 3F. Bet Persistence Across Rolls

Most bets persist across multiple rolls. The bet manager must handle this correctly:

### Bets That Persist Until Resolved
- Pass Line (until point hit or seven-out).
- Don't Pass (same).
- Come with established point (until Come Point hit or seven-out).
- Don't Come with established point (same).
- All odds bets (follow their parent).
- Place bets (until their number hits or seven-out — but can be removed voluntarily).
- Buy/Lay bets (same as Place).
- Hardway bets (until hard hit, easy hit, or seven-out).
- Big 6/Big 8 (until hit or seven-out).

### Bets That Resolve Every Roll (One-Roll Bets)
- Field.
- Any 7, Any Craps, Aces, Boxcars, Ace-Deuce, Yo, C&E, Horn.
- Hop bets.

One-roll bets must be re-placed manually each roll (or via "Same Bet" button).

### Bets That Survive Come-Out

When the point is made and a new come-out begins:
- Pass Line is resolved (won). Hero must place a new Pass Line.
- Established Come bets persist into the new come-out (they have their own points, independent of the Pass Line point).
- Come Odds: OFF by default on come-out. Hero can toggle ON.
- Place bets: OFF by default on come-out. Hero can toggle ON.
- Don't Pass/Don't Come bets that are still active persist.

---

## Acceptance Criteria

- Full game loop plays through multiple rolls with correct state transitions.
- Hero can place, remove, and adjust all supported bet types via the UI.
- Quick-bet buttons are context-aware and disabled when invalid.
- Odds bets can only be placed after point establishment; amounts snap to valid multiples.
- Come bets establish points correctly, with chip travel animation from COME area to number box.
- Seven-out cascade resolves all active bets with correct payouts.
- Pending Come bet wins on a seven-out while established Come bets lose.
- Puck animates between ON/OFF states and positions correctly on the point number.
- Stickman calls display correctly for all major roll outcomes.
- Shooter rotation works; bots roll automatically between hero betting actions.
- Working/not-working toggles respected on come-out rolls.
- Auto-roll mode works with configurable speed; pauses during hero bet actions.
- Rapid play mode skips all animations.
- Same Bet button correctly re-places previous bet configuration.
- Can play 50+ consecutive rolls without state corruption.
- Bankroll updates correctly after every resolution.
- Hero cannot roll with zero bets on the table (or this is configurable).
