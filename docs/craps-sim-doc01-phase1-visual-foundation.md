# Craps Simulator — Doc 01: Phase 1 — Table, Dice & Visual Foundation

## Goal

Render a polished craps table with the hero's rail position at bottom, the full betting layout, beautiful 3D dice, chip stacks, and the ON/OFF puck. No game logic yet — just the stage.

---

## 1A. Craps Table Component

### Reference SVG & Rendering Approach

The table is built from a **reference SVG** — an existing, geometrically accurate casino craps layout — rather than drawn freehand. This ensures spatial accuracy of every zone without manual coordinate guessing.

**Reference file:** `app/assets/reference/Craps_table_layout.svg` (800×400px, CC BY-SA 3.0, originally published by Betzaar.com via Wikimedia Commons).

**Reference SVG analysis (verified):**

| Zone | Present | Label | Notes |
|------|---------|-------|-------|
| Pass Line | ✓ | PASS LINE | L-shaped curve, bottom + left edge |
| Don't Pass | ✓ | Don't Pass Bar | Italic text, above Pass Line |
| Come | ✓ | COME | Large center rectangle, red text |
| Don't Come | ✓ | Don't Come Bar | Above Come area |
| Field | ✓ | FIELD | Shows 2 circled, • 3 • 4 • 9 • 10 • 11 •, 12 circled |
| Place 4 | ✓ | 4 | Number box |
| Place 5 | ✓ | 5 | Number box |
| Place SIX | ✓ | SIX | Spelled out (casino convention) |
| Place 8 | ✓ | 8 | Number box |
| Place NINE | ✓ | NINE | Spelled out (casino convention) |
| Place 10 | ✓ | 10 | Number box |
| Big 6/8 | ✓ | BIG 6 / 8 | Corner position, "B I G" vertical + rotated numbers |
| Any Seven | ✓ | SEVEN | Red text, center section |
| Any Craps | ✓ | ANY CRAPS | Red italic, bottom of center |
| Hardways (4) | ✓ | Dice images | SVG dice-pair paths for hard 4/6/8/10 |
| C&E | ✓ | C/E circles | 14 position-tracking circles |

**Known payout label errors in the reference (all use "FOR" notation labeled as "TO"):**

| Bet | Reference Shows | Correct "TO" Value |
|-----|----------------|-------------------|
| Any Seven | 5 to 1 | 4 to 1 |
| Any Craps | 8 to 1 | 7 to 1 |
| Hard 6/8 | 10 to 1 | 9 to 1 |
| Hard 4/10 | 8 to 1 | 7 to 1 |
| Aces/Boxcars | 31 to 1 | 30 to 1 |
| 3/11 | 16 to 1 | 15 to 1 |

**Zones correctly absent from the reference** (not printed on standard casino felts — these are verbal/dealer-managed bets): Hop bets, Buy bet area (dealer places BUY lammer in number box), Lay bet area (dealer places above number box), Horn bet box (covered by C/E area).

**The geometry is accurate. Only the payout text labels are wrong.** This is the key insight: the reference SVG gives us correct shapes, proportions, and spatial relationships. Our simulator replaces all text labels with values from `craps.config.ts`.

### Build Workflow: Reference Underlay Method

The interactive table is built by tracing over the reference SVG:

**Step 1 — Reference underlay.** During development, the table component renders `Craps_table_layout.svg` as a background image at 30% opacity behind the interactive SVG being constructed:

```vue
<!-- Development only — toggle via devReferenceUnderlay flag -->
<div class="table-container relative">
  <img
    v-if="devReferenceUnderlay"
    :src="referenceSvgUrl"
    class="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
    alt="Reference layout"
  />
  <svg viewBox="0 0 800 400" class="absolute inset-0 w-full h-full">
    <!-- Interactive zones built here, matching reference geometry -->
  </svg>
</div>
```

**Step 2 — Zone construction.** Each betting area is built as a named SVG `<g>` group with a `<path>` or `<rect>` matching the reference's zone boundary. The builder (Claude or developer) adjusts coordinates until each interactive zone aligns with the reference image underneath. Key zones are matched by tracing the reference's existing `<rect>`, `<line>`, and `<path>` elements — their coordinates are already in the reference SVG file itself (e.g., the number boxes are `rect` elements at known x/y positions, the Pass Line boundary is defined by the existing line geometry).

**Step 3 — Text from config.** All label text (zone names, payout ratios) is rendered from `craps.config.ts` payout tables, NOT copied from the reference SVG. This fixes the "FOR" vs "TO" payout errors automatically.

**Step 4 — Visual verification.** With the underlay toggled on, visually confirm alignment. This is done **once** during the Phase 1 build. After confirmation, the `devReferenceUnderlay` flag defaults to `false`.

**Step 5 — Automated validation.** The `table-completeness.test.ts` suite (see below) runs on every build and CI push to verify ongoing correctness.

### Reference Coordinate Extraction

The reference SVG's own elements provide precise coordinates for zone construction. Key coordinates from the reference file:

**Number boxes (from the reference `<rect>` and `<line>` elements):**
- Outer rect: x=163.75, y=25.211, width=375, height=100
- Column dividers at x: 226.28, 288.72, 351.25, 413.78, 476.217
- Row dividers at y: 47.396, 55.836, 117.711
- This gives 6 number box cells, each ~62.5px wide × ~62px tall

**Come area:** Large region between y=125.211 and y=188.336 (the come/field boundary)

**Field area:** y=188.336 to y=250.211, x=163.75 to x=476.25

**Don't Come bar:** y=250.211, width=312.5, height=37.5 (from reference `rect75`)

**Don't Pass bar:** Diagonal line from (163.75, 250.211) to (101.25, 187.711) forms the lower boundary. Vertical line at x=101.25 from y=125.211 to y=187.711 forms the left edge.

**Pass Line:** The L-shaped region outside the Don't Pass boundary, wrapping along the bottom and left edge. Defined by the outer table edge and the Don't Pass inner boundary.

**Center proposition section:** x=549.375 to x=774.375, with horizontal dividers at y: 173.527, 217.374, 261.221, 305.068, 348.916. Vertical dividers at x: 625, 662.5, 700.

These coordinates are extracted directly from the reference SVG source. The interactive SVG reuses them, giving pixel-perfect zone alignment with no guesswork.

### Table Structure

The craps table layout is bilaterally symmetric — the left and right ends are mirror images, each with identical betting areas. The center section contains proposition bets. The simulator renders the full table but the hero interacts primarily with the bottom wing.

- **Felt:** Deep emerald green background (`#009933` base from reference, refined with subtle gradient/texture).
- **Rail:** Walnut-colored padded rail surrounding the table with rubber pyramid wall (back wall). Inner shadow for depth.
- **The ON/OFF Puck:**
  - When OFF: Black side up, positioned in the Don't Come area or off to the side.
  - When ON: White side up, positioned on the Point number box.
  - Animated transition when point is established or cleared.

### Table Completeness Test (`tests/table-completeness.test.ts`)

Automated verification that the interactive SVG matches the game engine:

```typescript
// 1. Every BetType in the engine has a corresponding SVG zone ID
for (const betType of ALL_BET_TYPES) {
  expect(svgZoneIds).toContain(betTypeToZoneId(betType))
}

// 2. Every SVG zone has a click handler registered
for (const zoneId of svgZoneIds) {
  expect(clickHandlers).toHaveProperty(zoneId)
}

// 3. Payout text on the table matches craps.config.ts
for (const [betType, expectedPayout] of Object.entries(config.payouts)) {
  expect(renderedPayoutText(betType)).toBe(formatPayout(expectedPayout))
}

// 4. SIX and NINE are spelled out (not "6" and "9" in the number boxes)
expect(numberBoxLabel('place-six')).toBe('SIX')
expect(numberBoxLabel('place-nine')).toBe('NINE')

// 5. Don't Pass and Don't Come show bar-12 indicator
expect(zoneText('dont-pass')).toContain('Bar')
expect(zoneText('dont-come')).toContain('Bar')

// 6. ON/OFF puck has positions for all 6 point numbers
for (const point of [4, 5, 6, 8, 9, 10]) {
  expect(puckPositions).toHaveProperty(String(point))
}
```

### Responsive Strategy

- **1280px+ (desktop):** Table occupies ~70% width, stats panel ~30% on right. Full table visible.
- **768–1279px (tablet):** Full-width table. Stats panel slides in from right as overlay.
- **Below 768px (mobile):** Table scales to fit. Center proposition section collapses to a "Props" button opening a `<UModal>`. Minimum tap target: 44px.

The SVG `viewBox="0 0 800 400"` provides resolution-independent scaling. The container sets `width: 100%` with a CSS `min-width` to prevent illegible shrinkage.

---

## 1B. Dice Component

- **3D CSS dice:** Two cubes with proper pip layouts on all six faces.
  - White dice, red pips (standard casino dice).
  - Rounded corners with subtle shadow.
  - Each die shows its individual value — both values visible simultaneously.
- **Roll animation:** Dice tumble/rotate across the table from the shooter's position toward the back wall, bounce, and settle. CSS 3D transforms with spring physics easing.
- **Dice landing display:** After settling, both dice sit side by side near the center of the table. Large, clear, readable.
- **Total display:** The sum appears prominently (e.g., "8" in a gold badge) with a descriptive label:
  - Come-out 7/11: "NATURAL — Winner!"
  - Come-out 2/3/12: "CRAPS!"
  - Point established: "Point is 6"
  - Point hit: "WINNER — 6!"
  - Seven-out: "SEVEN OUT — Line away!"

### Dice Construction Detail

Each die face is a 6-face CSS cube using `transform-style: preserve-3d`. Pip layouts follow the standard Western die pattern:

| Face | Pip Arrangement |
|------|----------------|
| 1 | Center |
| 2 | Top-right, bottom-left (diagonal) |
| 3 | Top-right, center, bottom-left (diagonal) |
| 4 | 2×2 grid |
| 5 | 2×2 grid + center |
| 6 | 3×2 grid (two columns of three) |

The dice maintain standard die orientation: opposite faces always sum to 7 (1/6, 2/5, 3/4).

### Dice Animation Phases

1. **Launch** (0–200ms): Dice fly from shooter's rail position toward the center of the table. Slight upward arc.
2. **Tumble** (200–800ms): Both dice rotate on all three axes at different rates (so they look independent, not synchronized). Random rotation offsets per die.
3. **Bounce** (800–1200ms): Dice hit the "back wall" (far end of table), reverse direction slightly, lose rotational energy.
4. **Settle** (1200–1500ms): Dice slow and land on their final faces. Spring easing — slight overshoot and settle.

The final rotation values are pre-calculated from the random roll result, so the animation always lands on the correct faces. The tumble is cosmetic; the result is determined before animation starts.

---

## 1C. Chip Stack Component

Reused from the Hold'em simulator with denomination adjustments for craps table minimums.

| Tier | Table Min | Chip Colors |
|------|-----------|-------------|
| Low | $5 | white/$1, red/$5, green/$25, black/$100 |
| Medium | $10–$25 | red/$5, green/$25, black/$100, purple/$500 |
| High | $100–$500 | green/$25, black/$100, purple/$500, orange/$1,000 |

Chips stack with 3D offset (each chip slightly visible above the one below). Stack height communicates bet size at a glance.

### Chip Placement on Betting Areas

When the hero places a bet, chips appear on the corresponding table area:

- **Single chip** for bets at minimum.
- **Short stack** (2–5 chips) for medium bets, showing denomination colors.
- **Tall stack** (6+) for large bets.
- **Bet amount label** always visible above or below the chip stack (e.g., "$25").
- **Multiple bets in one area:** When multiple players bet on the same area (hero + bots), chips fan out slightly so each player's bet is distinguishable. Hero's chips are always closest to the hero's rail.

---

## 1D. Bet Placement UI

The hero places bets by:

1. **Selecting a chip denomination** from the chip tray (bottom of screen). Active chip glows. Tap a different denomination to switch.
2. **Clicking/tapping a valid betting area** on the table. The chip (or stack) appears on that area with the bet amount displayed.
3. **Click an existing bet to add to it** (press/increase). Each click adds one unit of the selected denomination.
4. **Right-click or long-press to remove a bet** (if removable — contract bets can't be removed).
5. **Toggle ON/OFF** for discretionary bets via a small lammer control.

### Visual Feedback

- **Valid areas glow subtly on hover** — a soft green pulse on the border.
- **Invalid areas show a disabled cursor** — e.g., Come area during come-out has a faint "X" or grayed-out appearance.
- **Contract bets show a lock icon** — Pass Line after point, Come after Come Point. No removal allowed.
- **Discretionary bets show an ON/OFF toggle** — small lammer indicator. White = ON, black = OFF.
- **Bet removal mode:** A "Take Down" button in the controls switches to removal mode — clicking any removable bet removes it. Visual: bets pulse red to indicate they can be removed.

### Quick-Bet Buttons

Below the chip tray, a row of quick-bet buttons for the most common bets:

- **Pass Line** — places selected chip amount on Pass Line (available during come-out only).
- **Come** — places on Come (available during point phase only).
- **Place 6** — places on Place 6 box.
- **Place 8** — places on Place 8 box.
- **Add Odds** — appears only when hero has a line bet and point is established. Presets: 1×, 2×, 3×, Max.

Quick-bet buttons are context-aware — disabled with tooltip explanation when not valid for the current game state.

---

## 1E. Player Rail & Bankroll

- **Hero chip rack** along the bottom rail — shows current bankroll as a chip stack visualization + numeric display. The chip rack uses the actual chip denominations to show the breakdown (e.g., 3 black + 1 green + 2 red = $350).
- **Bot players** (up to 7) have smaller bankroll displays along the left and right sides of the table. Their names, strategy labels, and bankroll amounts are visible. Their bets appear on the table in their designated zones (slightly offset from the hero's bets in shared areas).
- **Hero name** defaults to "Hero" — editable in setup.

---

## 1F. Setup Screen

Configure the game before playing:

### Stake Levels

| Level | Name | Min Bet | Max Bet | Starting Bankroll | Odds Multiple |
|-------|------|---------|---------|-------------------|---------------|
| 1 | Low Roller | $5 | $500 | $200 | 3-4-5× |
| 2 | Standard | $10 | $2,000 | $500 | 3-4-5× |
| 3 | Mid Stakes | $25 | $5,000 | $2,000 | 5× |
| 4 | High Roller | $100 | $10,000 | $5,000 | 10× |
| 5 | Whale | $500 | $50,000 | $25,000 | 20× |

Default: Level 2 (Standard).

### Custom Table Rules (Expandable Section)

- **Odds multiple:** 1×, 2×, 3-4-5×, 5×, 10×, 20×, 100×. Default: 3-4-5×.
- **Field bet 12 payout:** 2× or 3×. Default: 3× (Strip standard).
- **Buy bet vig timing:** "On every buy" or "On win only." Default: On win only for 4/10, on bet for others.
- **Hardways on come-out:** ON or OFF. Default: OFF.
- **Don't Pass bar number:** 12 (standard) or 2 (rare variant). Default: 12.
- **Payout rounding:** Round down to nearest dollar, nearest $0.25, or exact. Default: Round down to dollar.

### Bot Configuration

- **Number of bot co-bettors:** 0–7. Default: 3.
- **Per-bot dropdown:** Select from the 8 strategy personas (Conservative Carl, Don't Debbie, Iron Cross Irene, Martingale Mike, Regression Rick, Press Patricia, Prop Bet Pete, Three-Point Molly).
- **"Randomize All"** button — randomly assigns strategies to all bots.
- **"None"** button — removes all bots (solo hero mode).
- Default: 3 bots with random strategies.

### Other Setup Options

- **Hero name input** (defaults to "Hero").
- **Starting bankroll slider** — adjustable per stake level (0.5× to 5× the default).
- **Light/dark mode toggle.**

---

## 1G. Light/Dark Mode

Uses Nuxt UI's `useColorMode()` composable and `<UColorModeToggle>` component.

- **Dark mode (default):** Dark background, light text, muted chrome. Natural casino feel.
- **Light mode:** Light background, dark text, softer shadows. Daytime/accessibility preference.
- **Table is exempt:** Felt (emerald green), walnut rail, rubber pyramid wall, inner shadow, and center glow remain identical in both modes.
- **Chips adapt slightly:** Brighter chip colors in dark mode, slightly muted in light mode.
- Implemented via Tailwind's `dark:` variant classes.

---

## Acceptance Criteria

- Table renders with all betting areas correctly labeled and positioned.
- **Reference alignment verified:** With development underlay toggled on, interactive SVG zones align with `Craps_table_layout.svg` reference geometry within ±2px tolerance.
- **Table completeness test passes:** Every `BetType` has a zone, every zone has a handler, all payout text matches `craps.config.ts`, SIX/NINE spelled out, Bar-12 indicators present.
- All betting areas are interactive click/tap targets with hover feedback.
- Invalid betting areas show disabled state based on current game phase.
- Dice display both individual values and total clearly.
- Dice roll animation plays smoothly (placeholder — no real game logic yet).
- Chip placement on valid areas works; right-click/long-press removes discretionary bets.
- Contract bets show lock icon; discretionary bets show ON/OFF toggle.
- Quick-bet buttons are context-aware (disabled when invalid).
- ON/OFF puck displays correctly in both states with smooth transition animation.
- Stake selection produces correct table min/max, bankroll, and odds multiples.
- Bot configuration allows 0–7 bots with selectable strategies.
- Light/dark mode toggle works; table felt stays emerald green in both modes.
- Hero bankroll displays as chip rack + numeric amount.
- Looks polished on 1280×800+ viewports.
- Responsive: stats panel collapses on narrow screens; table scales appropriately.
- **Payout labels use "TO" notation throughout** (4 to 1, not 5 for 1). No "FOR" notation anywhere.
