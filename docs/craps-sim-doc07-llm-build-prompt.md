# Craps Simulator — Doc 07: LLM Build Prompt

## How to Use This Document

This document is fed to Claude Code (or any LLM coding agent) at the start of each phase build. It contains everything the agent needs to write correct code without referencing other documents. Each phase section below says "Feed this document + Phase N section from Doc XX" — the phase doc provides the detailed spec, this doc provides the invariant rules.

**Workflow per phase:**
1. Open a new Claude Code session.
2. Read the MBS Craps Game Rules PDF at `docs/MBS-Craps-Game-Rules-Version-3.pdf` — this is the government-approved regulatory and statistical reference for all bet resolution logic. The key rules are inlined below in the Canonical Rules Reference section, but the PDF is authoritative for any ambiguity.
3. Paste this entire document as the system context.
4. Paste the relevant phase doc (Doc 01 for Phase 1, Doc 02 for Phase 2, etc.) as the task.
5. Say: "Build Phase N. Follow the LLM Build Prompt rules. All code goes in the file structure below."

---

## Project Identity

**Name:** Craps Simulator
**Purpose:** Browser-based casino craps training tool. Educational — teaches which bets are mathematically sound, which are sucker bets, and why.
**License:** Personal project, not open-source (yet).
**Author:** Chris (IDS, ICJIA)

---

## Tech Stack (Non-Negotiable)

| Layer | Choice | Version | Notes |
|-------|--------|---------|-------|
| Framework | Nuxt | ^4.4.0 | `ssr: false` — client-side SPA only |
| UI Library | @nuxt/ui | ^4.6.0 | Includes Tailwind CSS v4, color mode, 100+ components |
| State | Pinia | Ships with Nuxt 4 | Single store: `useCrapsStore` |
| Language | TypeScript | Strict mode | No `any` types. No `// @ts-ignore`. |
| Package Manager | Yarn | 1.22.22 | Not npm. Not pnpm. Yarn Classic. |
| Deployment | Netlify | Static hosting | `yarn generate` → `.output/public/` |
| Testing | Vitest | Latest | Unit tests for engine. Component tests optional. |

**Do NOT use:**
- Vue 2, Vuex, Options API, Vuetify, or any non-Nuxt-UI component library.
- `ssr: true`, server routes, API routes, or any server-side code.
- npm, pnpm, or Bun.
- `v-html` anywhere — see Security section.
- Floating-point arithmetic for money — see Integer Cents section.

---

## File Structure

```
craps-simulator/
├── app/
│   ├── app.vue                    ← Root layout, NuxtPage
│   ├── app.config.ts              ← App-level config (theme overrides)
│   ├── pages/
│   │   ├── index.vue              ← Setup page (/)
│   │   ├── table.vue              ← Game table (/table)
│   │   └── [...slug].vue          ← Catch-all → redirect to /
│   ├── components/
│   │   ├── setup/                 ← Setup page components
│   │   │   ├── StakeSelector.vue
│   │   │   ├── TableRules.vue
│   │   │   ├── BotConfigurator.vue
│   │   │   └── HeroConfig.vue
│   │   ├── table/                 ← Game table components
│   │   │   ├── CrapsTable.vue     ← SVG table layout
│   │   │   ├── DicePair.vue       ← 3D CSS dice
│   │   │   ├── ChipStack.vue      ← Chip visualization
│   │   │   ├── Puck.vue           ← ON/OFF puck
│   │   │   ├── BetChip.vue        ← Chip placed on a bet zone
│   │   │   ├── ChipTray.vue       ← Denomination selector
│   │   │   ├── ControlBar.vue     ← Roll button, quick-bets, odds
│   │   │   └── StickmanCall.vue   ← Dealer callout text
│   │   ├── stats/                 ← Stats panel components
│   │   │   ├── StatsPanel.vue     ← Three-tab panel container
│   │   │   ├── LiveRollTab.vue
│   │   │   ├── MyStatsTab.vue
│   │   │   └── CompareTab.vue
│   │   └── bots/                  ← Bot display components
│   │       ├── BotRail.vue        ← Bot bankroll displays
│   │       └── BotBetDisplay.vue
│   ├── composables/
│   │   ├── useDice.ts             ← Roll function, dice state
│   │   ├── useBetManager.ts       ← Place, remove, resolve bets
│   │   ├── usePayoutCalc.ts       ← Integer-cent payout math
│   │   ├── useGameLoop.ts         ← State machine transitions
│   │   ├── useBotEngine.ts        ← Bot strategy decision engine
│   │   ├── useStatsTracker.ts     ← Session stats + localStorage
│   │   └── useAdvisor.ts          ← Smart bet recommendations
│   ├── stores/
│   │   └── craps.ts               ← useCrapsStore — single Pinia store
│   ├── utils/
│   │   ├── betTypes.ts            ← BetType enum + metadata
│   │   ├── payoutTables.ts        ← Payout ratio data
│   │   ├── houseEdges.ts          ← Reference house edge values
│   │   ├── sanitize.ts            ← Input sanitization (hero name)
│   │   └── format.ts              ← Currency formatting (cents → display)
│   └── assets/
│       └── reference/             ← Reference SVG (development underlay ONLY — not production)
├── craps.config.ts                ← Master config: stakes, payouts, bots, animation
├── nuxt.config.ts
├── package.json
├── netlify.toml
├── tests/
│   ├── dice.test.ts               ← Chi-squared uniformity
│   ├── payout.test.ts             ← Payout precision per bet type
│   ├── resolver.test.ts           ← Bet resolution correctness
│   ├── house-edge.test.ts         ← 1M-roll convergence per bet type
│   ├── come-lifecycle.test.ts     ← Come bet state machine
│   ├── seven-out.test.ts          ← Cascade resolution
│   ├── table-completeness.test.ts ← SVG zone ↔ BetType parity
│   └── bot-strategies.test.ts     ← Each bot executes per spec
└── yarn.lock
```

---

## Architecture Rules

### Table SVG: Reference Underlay, Not Production Asset

The repo includes a Wikimedia Commons SVG (`docs/Craps_table_layout.svg`, 800x400, CC BY-SA 3.0). **This is a development reference only — it is NOT the production table.** The reference SVG has:
- Correct geometry (zone shapes, proportions, spatial relationships)
- **Incorrect payout text** (systematic "FOR" vs "TO" notation error — every prop bet label is wrong)
- Generic element IDs (`rect11`, `line13`) — no semantic zone IDs

**Build workflow:**
1. During Phase 1 development, render the reference SVG at 30% opacity as a background underlay behind your new interactive SVG.
2. Build each zone by tracing the reference geometry, using semantic IDs (`pass-line`, `place-six`, `hard-4`, etc.).
3. All text labels and payout ratios come from `craps.config.ts`, NOT from the reference SVG.
4. After visual verification (±2px alignment), disable the underlay. It never ships to production.
5. The production table is a fully custom interactive SVG with click handlers, hover states, chip placement anchors, and puck position coordinates for all 6 point numbers.

See Doc 01 for the complete zone inventory, coordinates, and the `devReferenceUnderlay` toggle implementation.

### SPA Mode

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui'],
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },
  app: {
    head: {
      title: 'Craps Simulator',
    },
  },
})
```

This produces a client-side SPA deployed as static files. No server-side rendering. No pre-rendering. The browser receives an empty HTML shell, loads the JS bundle, and Vue renders everything client-side.

### Netlify Config

```toml
# netlify.toml
[build]
  command = "yarn generate"
  publish = ".output/public"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

The redirect rule is required — since there's only one `index.html`, all routes must fall through to it.

### Two Routes

```
/       → Setup page (configure game, select bots, set table rules)
/table  → The craps table (play the game)
```

State flows from setup → store → game. Refreshing on `/table` resumes from localStorage. Navigating to `/` resets the session (with confirmation dialog).

### Single Pinia Store

One store: `useCrapsStore`. Contains all game state — phase, point, puck, dice, active bets, resolutions, table rules, players, session stats. No other stores.

### Integer-Cent Arithmetic

**All money values are stored and computed as integers representing cents.** $10.00 = 1000 cents. $5.83 = 583 cents. This eliminates floating-point drift in payout calculations.

```typescript
// WRONG — floating point
const payout = wager * 7 / 6  // $6 × 7/6 = 6.999999999

// CORRECT — integer cents
const payoutCents = Math.floor(wagerCents * 7 / 6)  // 600 × 7 / 6 = 700 exactly
```

Display formatting converts cents to dollars only at render time:

```typescript
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
```

### Payout Ratios

Payouts are defined as `[numerator, denominator]` tuples in `craps.config.ts`:

```typescript
// Place 6 pays 7:6
const payout = Math.floor(wagerCents * 7 / 6)

// Pass odds on 5/9 pays 3:2
const payout = Math.floor(wagerCents * 3 / 2)

// Vig calculation (5% of wager, rounded DOWN)
const vig = Math.floor(wagerCents * 5 / 100)
```

**Rounding is always `Math.floor` (round down to nearest cent), matching Vegas casino practice.** This is a non-negotiable arithmetic rule — all payout calculations use `Math.floor`, never `Math.ceil` or `Math.round`. The `payoutRounding` table rule controls the **minimum chip denomination** for display: `'dollar'` rounds the final payout down to whole dollars, `'quarter'` rounds down to $0.25 increments, and `'exact'` pays to the penny. All three options still use `Math.floor` — they differ only in granularity, not direction.

### BetType Enum

```typescript
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

This is the complete enum — **44 named bet types**. Every BetType must have: a payout ratio in `craps.config.ts`, a house edge reference value, an SVG zone ID on the table, and a resolution rule in the bet resolver.

### ActiveBet Interface

```typescript
interface ActiveBet {
  id: string
  type: BetType
  owner: string                   // 'hero' | bot ID
  amount: number                  // wager in cents
  oddsAmount: number | null       // attached odds bet in cents
  pointNumber: number | null      // for come/don't come with established point
  isContract: boolean             // true = cannot be removed
  isWorking: boolean              // ON/OFF lammer state
  status: 'pending' | 'active' | 'resolved'
  placedOnRoll: number            // roll number when placed
}
```

### Game State Machine

```
SETUP → COME_OUT → POINT_PHASE → RESOLVING → BETWEEN_ROLLS
                                                    ↓
                                              (if seven-out)
                                            SEVEN_OUT → SHOOTER_CHANGE → COME_OUT
```

Transitions must be explicit — no implicit state changes. The `phase` field in the store is the single source of truth.

---

## Security Rules (Apply to Every Phase)

1. **No `v-html`.** Ever. Use `{{ }}` template interpolation only.
2. **No CDN scripts.** All code bundled at build time.
3. **No URL-based state.** State lives in Pinia and localStorage.
4. **No secrets.** Zero environment variables with sensitive values.
5. **Commit `yarn.lock`.** Build with `--frozen-lockfile`.
6. **Integer cents.** All money as integers. No floating-point currency.
7. **Sanitize hero name.** Strip HTML, limit 32 chars, on input.
8. **Try/catch localStorage.** Corrupted data → reset to defaults, don't crash.

---

## Testing Requirements (Per Phase)

### Phase 1 — Visual Foundation
- Table SVG renders with all zone IDs present.
- Setup page validates inputs (non-empty name, bankroll > 0).
- Dice animation plays without JS errors.
- Light/dark toggle works; felt stays emerald in both modes.

### Phase 2 — Dice Engine
- **Chi-squared test:** 1M+ rolls, p-value > 0.01 for all 36 outcomes.
- **House edge convergence:** Each bet type converges to ±tolerance over 1M+ rolls (see Doc 02 for tolerance table).
- **Come bet lifecycle:** Placement → point establishment → resolution tracks correctly.
- **Seven-out cascade:** All bet types resolve correctly in a single cascade.
- **Payout precision:** Integer-cent math produces exact payouts for all ratio types.

### Phase 3 — Game Loop
- 50+ consecutive rolls without state corruption.
- All bet types placeable and resolvable via the UI.
- Puck transitions correctly on point establishment and resolution.
- Working/not-working toggles respected on come-out rolls.

### Phase 4 — Bot Systems
- Each of 8 bot strategies executes per its defined algorithm.
- Martingale doubling respects table max and bankroll limits.
- No bot strategy produces positive EV over 100K+ rolls.
- Bust-out detection triggers correctly.

### Phase 5 — Stats Panel
- EV calculations correct for all bet types.
- Per-bet-type breakdown tracks accurately.
- Bankroll chart renders with theoretical overlay.
- Session stats persist across page refreshes via localStorage.

### Phase 6 — Polish
- Full game plays 100+ rolls without visual glitches.
- Animations don't block game logic (async with proper await).
- Come bet chip travel animation is visually clear.
- Responsive layout works at 1280px+ and degrades gracefully.

---

## Canonical Rules Reference

**MBS Craps Game Rules Version 3** (Singapore Gambling Regulatory Authority, 27 Feb 2020) is the canonical rules reference. The PDF is in the repo at `docs/MBS-Craps-Game-Rules-Version-3.pdf`. Below are the key rules inlined so the LLM has them directly:

### MBS Rules — Inlined for LLM Context

**Contract wagers (MBS 1.1.4):** A contract wager, once placed, cannot be removed or reduced. A player can increase the contract wager once the Point has been established.

**Pass Line (MBS 3.4.1):** Contract wager placed prior to Come Out Roll. Wins on 7/11, loses on 2/3/12 during come-out. During point phase, wins if point rolls before 7, loses on 7.

**Don't Pass (MBS 3.4.5):** Placed prior to Come Out Roll. Wins on 2/3, loses on 7/11, stands off (push) on 12 during come-out. During point phase, wins on 7, loses if point rolls first.

**Don't Pass / Don't Come removal constraint (MBS 3.16.1):** These wagers may be removed or reduced at any time, but **may not be replaced or increased** after such removal or reduction. The bet manager must track whether a Don't bet has been voluntarily reduced/removed during the current point cycle and block re-placement.

**Don't Come always ON (MBS 3.16.2):** All Don't Come wagers shall be ON unless removed by the Dealer at the player's request.

**Come (MBS 3.4.3):** Contract wager placed during point phase. First roll: wins on 7/11, loses on 2/3/12, otherwise establishes a Come Point. After Come Point established, wins if Come Point rolls before 7, loses on 7.

**Don't Come (MBS 3.4.7):** Placed during point phase. First roll: wins on 2/3, loses on 7/11, stands off on 12. After point established, wins on 7, loses if Come Point rolls first.

**Odds bets (MBS 3.4.2, 3.4.4, 3.4.6, 3.4.8):** Additional wagers placed after a point is established, behind an existing line bet. Wins/loses with the parent bet. Pays at true odds (zero house edge). Pass/Come Odds: 6:5 on 6/8, 3:2 on 5/9, 2:1 on 4/10. Don't Pass/Come Odds: 5:6 on 6/8, 2:3 on 5/9, 1:2 on 4/10.

**Place bets (MBS 3.4.9):** Wager on a specific number (4/5/6/8/9/10). Wins when that number rolls, loses on 7. When puck is ON, Place bets are working unless player calls OFF. When puck is OFF, Place bets are NOT working unless player calls ON. Payouts: 9:5 (4/10), 7:5 (5/9), 7:6 (6/8).

**Buy bets (MBS 3.4.10):** Same as Place but pays true odds (2:1, 3:2, 6:5) with 5% vigorish on the wager at time of placement. Same ON/OFF rules as Place bets.

**Buy vig refund (MBS 3.4.10.1):** If Buy wagers are taken down prior to the two dice coming to rest upon a valid roll, the vigorish shall be returned.

**Lay bets (MBS 3.4.11):** Bet that 7 rolls before a specific number. Pays inverse true odds (1:2, 2:3, 5:6) with 5% vigorish on the amount the player can win. **Lay bets are always working** on every roll, including come-out, unless the player explicitly calls them OFF.

**Hardways (MBS 3.4.12):** Wager on a specific hardway (hard 4/6/8/10). Wins if the selected total rolls the hard way (matching dice) before 7 or the easy way. When puck is ON, hardways are working unless called OFF. When puck is OFF, hardways are NOT working unless called ON. Payouts: 7:1 (hard 4/10), 9:1 (hard 6/8).

**Field (MBS 3.4.13):** One-roll wager. Wins on 2/3/4/9/10/11/12, loses on 5/6/7/8. Payouts: 1:1 on 3/4/9/10/11; bonus on 2 and 12 per table rules (MBS default: 2:1 on both; US default: 2:1 on 2, 3:1 on 12 — configurable).

**Horn (MBS 3.4.14):** One-roll, 4-unit wager ($1 each on 2/3/11/12). Wins if any of those totals roll. Paid as individual bets: 30:1 on 2/12, 15:1 on 3/11, minus 3 losing units.

**Horn High (MBS 3.4.15):** 5-unit bet: 4 units as Horn + 1 extra unit on player's chosen number. Paid as individual bets.

**Proposition bets (MBS 3.4.16–3.4.22):** One-roll bets. Any Craps (7:1), Any Seven (4:1), C&E (3:1 on craps, 7:1 on 11), Yo/Eleven (15:1), 3 Crap (15:1), 2 Crap/Aces (30:1), 12 Crap/Boxcars (30:1).

**Default come-out working status (MBS 3.17):** All Buy, Place, Come Odds, and Hardway wagers are OFF on come-out rolls unless player calls ON. (Exception: Lay bets and Don't Come flat bets are always ON.)

**Settlement payout tables (MBS Section 4):** All payouts use "TO" notation (e.g., 30 TO 1 = win $30 + keep $1 wager). See `craps.config.ts` for the complete ratio table.

### Secondary Reference

**Colorado Division of Gaming Rule 23** is the secondary reference (US state law, 44 named bet types). Notable: Colorado law requires payout rounding **up** per 30-2306(4) — this is a jurisdictional variant. **This simulator uses Vegas convention (round DOWN via `Math.floor`)** as the canonical default. The rounding direction is not configurable — it is always `Math.floor`.

---

## Phase Build Checklist

Before marking any phase complete, verify:

- [ ] All acceptance criteria from the phase doc are met
- [ ] All relevant tests from the Testing Requirements section pass
- [ ] No `v-html` in any template
- [ ] No floating-point money arithmetic
- [ ] No `any` types in TypeScript
- [ ] `yarn generate` produces a working build
- [ ] The build deploys to Netlify without errors
- [ ] Hero name sanitization active (if Phase 1+ is complete)
- [ ] localStorage read/write wrapped in try/catch (if Phase 3+ is complete)
