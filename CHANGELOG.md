# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-04-04

### Phase 3 — Game Loop & Hero Interaction
- **Same Bet button**: Re-places the hero's previous bet configuration after a roll resolves. Skips bets invalid for the current phase.
- **Auto-roll mode**: Toggle with configurable speed (1s, 2s, 3s, 5s). Countdown progress bar shows time to next roll. Pauses when hero interacts with the table.
- **Rapid play mode**: Toggle that skips dice animation for faster rolls (~50ms per roll vs 800ms).
- **Payout animations**: Floating +$X (green) and -$X (red) text rises from the table after each roll, staggered for multiple bets.
- **Take-down mode**: Toggle that lets you click any removable bet to remove it. Contract bets (Pass/Come with point) stay locked.
- **Keyboard shortcut**: Spacebar to roll dice.
- **Shooter rotation**: Shows current shooter name in header. Roll button label changes from "Shoot" (hero is shooter) to "Roll" (bot is shooter).
- **Auto-roll countdown bar**: Green progress bar below table shows time until next auto-roll.
- **Same Bet tracks full config**: Saves all active bet types and amounts before each roll for accurate re-placement.

## [0.1.0] - 2026-04-04

### Phase 1 — Visual Foundation
- Interactive SVG craps table with all 44 betting zones and semantic IDs
- Tooltips on every zone explaining the bet, house edge, and availability
- Pointer cursor on available zones, not-allowed cursor on disabled zones
- 3D-style dice with shake animation and pip display
- Chip tray with denomination selection ($5, $10, $25, $100)
- Chip placement on table zones with bet amount display
- ON/OFF puck with correct positioning for all 6 point numbers
- Setup page with hero config, 5 stake levels, configurable table rules, and 0-7 bot selection
- Casino-dark aesthetic with emerald felt, gold accents, dark mode default
- Responsive layout with collapsible stats sidebar
- Light/dark mode support (table felt stays emerald in both modes)
- Stickman call announcements with color-coded floating banner

### Phase 2 — Dice Engine & Bet Resolution
- Complete dice engine with Math.random() uniform [1,6] generation
- Integer-cent arithmetic for all money (prevents floating-point payout errors)
- Full bet resolution engine covering all 44 bet types
- Game state machine: COME_OUT → POINT_PHASE → RESOLVING → SEVEN_OUT → SHOOTER_CHANGE
- Seven-out cascade: all bets resolve correctly in a single cascade (pending Come bets WIN on 7)
- Payout calculator with configurable rounding (dollar, quarter, exact — all Math.floor)
- Vig calculation for Buy/Lay bets (on-bet or on-win, configurable)
- Bet validation: timing, sizing, bankroll, odds constraints, Don't bet removal (MBS 3.16.1)
- Buy bet vig refund on takedown before next roll (MBS 3.4.10.1)
- Working/not-working rules per MBS 3.17 (Place/Buy/Hardways OFF on come-out by default)
- Lay bets always working including come-out (MBS 3.4.11)
- Statistical validation test suite: chi-squared dice uniformity, house edge convergence, payout precision, come bet lifecycle, seven-out cascade (63 tests, all passing)

### Advisor & Stats Panel
- Real-time teaching advisor with beginner-friendly explanations
- Separate "Action" (what to do), "DO THIS →" (where to click), and "Detail" (why) sections
- Post-roll result analysis explaining what happened and why in plain English
- All available bets ranked best → worst with house edge, payout, rating, and board location
- Color-coded ratings: ★ BEST (green), ✓ GOOD (blue), ○ OK (neutral), ⚠ POOR (amber), ✗ AVOID (red)
- Sucker bet warnings with concrete math (e.g., "Big 6 costs 6× more than Place 6")
- Bet sizing tips (Place 6/8 in multiples of $6, etc.)
- Gambler's fallacy guard ("dice have no memory")
- Session stats: rolls, P&L, wagered, points made, roll distribution chart, last 20 rolls
- Per-bet-type performance tracking (W/L/P, net P&L, total wagered)

### Game Controls
- Roll requires Pass Line or Don't Pass bet (MBS Rule 3.7)
- Quick-bet buttons: Pass Line, Come, Place 6, Place 8, Max Odds
- Visible clickable Odds zone on table with pulsing dashed border when available
- Context-aware button states with tooltips explaining why buttons are disabled
- New Game confirmation modal (Nuxt UI v4 UModal with title/description/footer slots)

### Infrastructure
- Nuxt 4 SPA mode (ssr: false) with Pinia state management
- Nuxt UI v4 component library
- Vitest test suite (63 unit tests, 100% coverage on engine)
- TypeScript strict mode (zero type errors)
- Netlify deployment config with CSP headers
- localStorage session persistence with graceful corruption handling
- MIT License
- pnpm package manager
- Node 22.22.0 (.nvmrc)
