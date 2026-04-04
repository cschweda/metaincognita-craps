# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-04-04

### Game Engine Fixes (Critical + High)
- **Come Odds orphan fix**: OFF Come/Pass Odds are now returned to the player when their parent bet is resolved while odds are not working (e.g., come-out 7 with established Come bet)
- **Seven-out sweep**: OFF Place/Buy/Hardways are swept as losses on seven-out. OFF odds are returned to player.
- **Hop bet resolution**: `hopEasy` and `hopHard` bets now resolve correctly (15:1 and 30:1 payouts)
- **C&E payout fix**: C&E is now a 2-unit bet — one unit on Any Craps (7:1), one unit on Yo (15:1). Previously overpaid by applying ratio to full amount.
- **Horn High payout fix**: Horn High is now a 5-unit bet (2 units on the high number, 1 each on others). Previously used 4-unit Horn math.
- **Don't Pass/Don't Come Odds max**: Lay odds now enforced — sized so payout doesn't exceed the equivalent pass odds max.
- **dontPassOdds always working**: Can no longer be toggled off (was missing from the always-working check in `toggleBetWorking`).
- **C&E/Horn High divisibility**: C&E requires divisible-by-2, Horn High requires divisible-by-5.

### Study Mode
- **Study Mode toggle**: New "Study" button in header pauses the game and lets you hover over any zone for a detailed explanation.
- **Context-aware tooltips**: Study tooltips show bet name, house edge, full description, and current status (your bet amount, availability, why it's disabled).
- **Cursor changes to help**: Visual indicator that betting is paused while studying.
- **Auto-roll pauses**: Auto-roll stops when study mode is activated.
- **Removed browser tooltips**: Removed native SVG `<title>` elements that caused random question mark cursors.

### App Shell & Navigation
- **Top status bar**: Context-aware back button across all pages. On table page, warns before resetting session. On sub-pages, returns to previous page with game state preserved.
- **Bottom status bar**: Persistent footer with links to History, Analysis, and GitHub repository.
- **History page** (`/history`): Roll-by-roll session log with summary stats (total rolls, points made/missed, longest shooter).
- **Analysis page** (`/analysis`): Statistical dashboard with P&L overview, roll distribution chart (actual vs. expected), and per-bet-type performance table.
- **Default layout**: All pages wrapped in consistent layout with top/bottom bars. Game state auto-saves on navigation.
- **Session indicator**: Pulsing green dot in top bar shows when an active session exists while browsing sub-pages.

### Polish & DX
- **Hero image**: SVG + PNG hero banner for README with dice, chips, advisor panel, session stats, and casino aesthetic
- **SPA loading screen**: Dark-themed loading template with animated dice and gold progress bar (eliminates white flash on load)
- **Cache clean script**: `pnpm clean` removes `.nuxt` and `node_modules/.vite` for stale dependency issues
- **README hero**: Hero image added to top of README
- **Simulation disclaimer**: README now explicitly states this is a single-player simulation with no real money or gambling

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
