# Craps Simulator — Doc 11: Architecture Decisions

## Purpose

Architecture Decision Records (ADRs) documenting the key technical choices for the craps simulator, their rationale, alternatives considered, and consequences.

---

## ADR-01: Client-Side SPA with No Server

**Status:** Accepted

**Context:** The simulator is a game with no backend data requirements. All computation (dice, bet resolution, bot strategy, statistics) runs in the browser. There is no user authentication, no persistent database, and no real money.

**Decision:** Build as a client-side SPA using Nuxt 4 with `ssr: false`. Deploy as static files on Netlify.

**Alternatives considered:**
- **SSR (Nuxt with `ssr: true`):** Adds server complexity for no benefit. Craps state is entirely client-side. SSR would introduce hydration mismatch risks with complex game state (active bets, animation queues, puck state).
- **Static pre-rendering (`nuxt generate` with SSR):** Pre-renders routes at build time. Unnecessary — the app has only two routes and all content is dynamic.
- **Server + database:** Would enable persistent cross-session stats and multiplayer. Massively overbuilt for v1. The Supabase path is documented as a future enhancement if needed.

**Consequences:**
- Zero hosting cost (Netlify free tier handles static SPAs).
- No server to maintain, patch, or secure.
- No SEO (acceptable — it's a game, not a content site).
- Session data limited to localStorage (acceptable for single-player educational tool).
- Adding persistence later requires a backend (Supabase is the planned path).

---

## ADR-02: Pinia Single Store Over Multiple Stores or Vuex

**Status:** Accepted

**Context:** The game has a single, deeply interconnected state: the dice roll affects the puck, which affects bet resolution, which affects bankrolls, which affects bot decisions, which affect the stats panel. Every piece of state is related to every other piece.

**Decision:** Use a single Pinia store (`useCrapsStore`) for all game state.

**Alternatives considered:**
- **Multiple Pinia stores** (e.g., `useDiceStore`, `useBetStore`, `useStatsStore`): Would fragment related state across stores, requiring cross-store watchers and increasing complexity. When a seven-out occurs, the dice store, bet store, player store, and stats store would all need coordinated updates — this is exactly the problem a single store solves.
- **Vuex:** Legacy. Pinia is the official Vue state manager, ships with Nuxt 4, has better TypeScript support, and doesn't require mutations (direct state modification is fine).
- **Composables only (no store):** Would lose reactivity tracking and make state persistence harder. Pinia's `$subscribe` and plugin system make localStorage persistence straightforward.

**Consequences:**
- One store file that grows large (expected: 200-400 lines of state + getters + actions).
- All state mutations happen in one place — easy to audit, easy to persist.
- Getters compute derived values (EV per roll, effective house edge, point probability) reactively.
- The `animating` flag lives in the same store as game state, ensuring UI controls are disabled during animations without cross-store coordination.

---

## ADR-03: Integer-Cent Arithmetic Over Floating-Point

**Status:** Accepted

**Context:** Craps payouts involve fractional ratios: 7:6 (Place 6), 3:2 (odds on 5/9), 6:5 (odds on 6/8). Floating-point arithmetic in JavaScript produces rounding errors: `6 * 7 / 6` = `6.999999999999999`, not `7`.

**Decision:** Store all money values as integers representing cents. $10.00 = 1000. Compute payouts as integer division with `Math.floor`. Convert to dollars only at display time.

**Alternatives considered:**
- **Floating-point with rounding at display:** Simpler to write but accumulates errors over thousands of bets. The statistical validation suite would fail to converge to exact house edges because of persistent micro-rounding in one direction.
- **Decimal.js / Big.js library:** Correct arithmetic but adds a dependency for a problem that integer math solves with zero overhead.
- **Rational number library:** Exact fractions (e.g., `Fraction(7, 6)`). Elegant but overkill — integer cents with `Math.floor` matches exactly how real casinos handle payouts.

**Consequences:**
- All payout calculations are exact within the cent. `600 * 7 / 6 = 700` (exactly $7.00).
- `Math.floor` matches casino rounding convention (always round down, favoring the house).
- The `formatCents()` utility is the only place where division by 100 occurs.
- The store, bet manager, payout calculator, and bot bankrolls all operate in cents. No mixing of dollars and cents anywhere.

---

## ADR-04: SVG Table Rendering Over Canvas or HTML/CSS

**Status:** Accepted

**Context:** The craps table has complex geometry: curved Pass Line, angled corners, dense center proposition grid, and 30+ labeled betting zones that need to be individually interactive (click targets for bet placement).

**Decision:** Render the table as a single SVG element with named `<g>` groups for each betting zone. Interactive behavior via Vue event handlers on the SVG groups.

**Alternatives considered:**
- **HTML Canvas:** Good for high-performance rendering (thousands of objects) but terrible for interactivity — canvas has no DOM, so click targets require manual hit testing. Also no built-in text scaling or accessibility.
- **Pure HTML/CSS:** Works for rectangular layouts but craps has curved geometry (Pass Line wraps around the wing) that CSS handles poorly. Would require extensive `clip-path` or absolute positioning hacks.
- **Pre-rendered image with overlay divs:** The approach used by many existing craps simulators. Looks cheap, doesn't scale, and makes the validation checklist (Doc 06) impossible to automate.

**Consequences:**
- SVG scales perfectly (resolution-independent via `viewBox`).
- Each zone is a DOM element with a unique ID — enables automated testing (`table-completeness.test.ts` verifies BetType ↔ SVG zone parity).
- Text on the table is real text (searchable, scalable, screen-reader accessible).
- Vue event handlers (`@click`, `@mouseenter`) work natively on SVG groups.
- The reference SVG (`Craps_table_layout.svg`, Wikimedia CC BY-SA 3.0) provides geometry validation — the app's SVG coordinates can be verified against the reference during development.

---

## ADR-05: Reference SVG Underlay Development Approach

**Status:** Accepted

**Context:** Building the craps table SVG from scratch risks missing zones, incorrect geometry, or misaligned proportions. A reference image exists (Wikimedia `Craps_table_layout.svg`, 800×400px, CC BY-SA 3.0).

**Decision:** Use the reference SVG as a development underlay. During Phase 1 development, render the reference SVG at reduced opacity behind the app's SVG. Build each zone by tracing the reference geometry. Remove the underlay before production. All text and payout labels come from `craps.config.ts`, not from the reference (the reference has systematic payout errors — all labeled as "FOR" instead of "TO").

**Alternatives considered:**
- **Build from memory/description only:** High risk of geometry errors and missing zones.
- **Use the reference SVG directly as the table:** The reference has incorrect payout text (off by +1 on all payouts due to FOR/TO confusion). Cannot be used as-is.
- **Commission a custom SVG:** Expensive and unnecessary when a CC BY-SA reference exists.

**Consequences:**
- Guaranteed geometric accuracy — the app's table matches real casino proportions.
- All text is generated from config data, ensuring payout labels are correct.
- The reference is a development tool only — not shipped in production.
- The underlay toggle becomes a developer setting (environment variable or dev-only composable).

---

## ADR-06: No Web Workers for Dice Generation

**Status:** Accepted

**Context:** Web Workers can offload CPU-intensive computation to a background thread, preventing UI jank. Should the dice engine run in a worker?

**Decision:** No. All computation runs on the main thread.

**Rationale:** The dice engine generates two random numbers and sums them — O(1) per roll. The bet resolver iterates active bets — O(n) where n is typically 5-15. The payout calculator runs integer division — O(1) per bet. The statistical validation suite (1M+ rolls) runs in a test environment, not in the game UI. Total computation per roll: microseconds. Web Workers would add complexity (message passing, serialization) for zero performance benefit.

**Revisit if:** The Strategy Lab feature (100K simulated rolls in batch) is implemented. That might benefit from a Worker to keep the UI responsive during long simulations. But it's a future enhancement.

---

## ADR-07: localStorage Over IndexedDB for v1

**Status:** Accepted

**Context:** Session state (bankroll history, bet type stats, session performance) needs to persist across browser refreshes.

**Decision:** Use `localStorage` with JSON serialization for v1.

**Alternatives considered:**
- **IndexedDB:** More powerful (structured queries, larger storage, async API). But overkill for storing a single JSON blob of session stats. The async API complicates store hydration on page load.
- **Supabase:** Cloud persistence with cross-device sync. Requires authentication, adds a backend dependency, and is unnecessary for a single-player educational tool.
- **No persistence:** User loses everything on refresh. Unacceptable UX.

**Consequences:**
- Simple synchronous API: `getItem`, `setItem`, `removeItem`.
- ~5MB storage limit per origin (more than sufficient for session data).
- Data tied to one browser (no cross-device sync).
- Must wrap all operations in try/catch — localStorage can throw on quota exceeded, private browsing restrictions, or corrupted data.
- Store validates data shape on hydration — if schema doesn't match (due to version upgrade or corruption), reset to defaults.

**Migration path:** If Supabase is added later, localStorage becomes a local cache. The Pinia store writes to both localStorage (immediate) and Supabase (debounced, background). On load, hydrate from localStorage first, then sync with Supabase.

---

## ADR-08: Deterministic Bot Strategies Over Probabilistic

**Status:** Accepted

**Context:** The Hold'em simulator uses probabilistic bot AI (bots make different decisions with the same inputs based on personality-weighted random factors). Should craps bots use the same approach?

**Decision:** No. Craps bot strategies are fully deterministic. Given the same game state and bankroll, a bot always makes the same betting decision.

**Rationale:** Craps betting systems are mechanical by nature. Martingale: double after loss. Iron Cross: always Place 5, 6, 8 + Field. Three-Point Molly: always have three numbers working with odds. There is no hidden information in craps (unlike poker, where you don't know opponents' cards), so there's nothing for a bot to "reason about" probabilistically. The educational value comes from the systems themselves, not from random variation in execution.

**Consequences:**
- Bot behavior is reproducible — the same sequence of rolls produces the same bot outcomes every time (useful for debugging and validation).
- The `decidePreRollBets()` function is a pure function of game state + bankroll + strategy.
- Martingale Mike is the one edge case — his bet size depends on his loss streak history, which is still deterministic (track consecutive losses, double accordingly).
- No randomness means no seed-based replay is needed for bots.

---

## ADR-09: MBS Rules as Canonical Reference Over Other Sources

**Status:** Accepted

**Context:** Craps rules vary by jurisdiction and casino. We cross-validated against five sources: MBS Craps Game Rules Version 3, Bally's Atlantic City Gaming Guide, Mensa Guide to Casino Gambling, Colorado Division of Gaming Rule 23, and an anonymous AU/NZ casino rule book.

**Decision:** MBS Craps Game Rules Version 3 is the canonical rules reference. Colorado Division of Gaming Rule 23 is the secondary reference.

**Rationale:** MBS is the most comprehensive single document. It covers every bet type, every edge case (Don't Pass removal constraints, Buy vig refund on takedown, Lay always-working, Horn High as 5-unit bet, Don't Come always ON), and includes an Appendix D wager placement diagram that validates zone completeness. All standard payouts match exactly. Colorado provides US state law backing with 44 named bet types — useful as a legal authority.

**Consequences:**
- When sources conflict, MBS wins. The Bally's guide has a known formatting error (Craps 3 / Yo listed as "30 to 1" when they should be 15:1 each). The AU/NZ source pays 32:1 on Craps 2/12 instead of 30:1 — a jurisdictional variant we don't implement.
- The simulator's Field bet defaults to 2:1/3:1 (most common on the Las Vegas Strip), not 2:1/2:1 (the higher-edge variant in Bally's guide). This is configurable.
- All rule citations in the design docs reference MBS section numbers (e.g., "MBS 3.16.1") for traceability.

---

## ADR-10: Nuxt UI Over Vuetify or Custom Components

**Status:** Accepted

**Context:** The simulator needs a component library for non-game UI elements: buttons, selectors, sliders, modals, tabs, accordions, toggles, color mode switching. The game-specific visuals (SVG table, dice, chips, puck) are always custom.

**Decision:** Use Nuxt UI v4 for all chrome/control UI. Custom components only for game visuals.

**Alternatives considered:**
- **Vuetify 3:** Mature, comprehensive, but heavy. Vuetify's opinionated Material Design aesthetic conflicts with the casino-dark luxury feel. Also, migrating Vuetify between major versions is painful (relevant experience from the ICJIA main site Vue 2 → Vuetify 2 → 3 migration).
- **Headless UI / Radix Vue:** Maximum flexibility but requires writing all styling from scratch. More work for a solo developer.
- **No library (all custom):** Maximum control but enormous time investment for standard UI patterns (accessible dropdowns, modal focus trapping, color mode persistence).

**Consequences:**
- Nuxt UI v4 ships with Tailwind CSS v4, color mode support, and 100+ accessible components — including everything the setup page needs.
- The `dark` color mode preference matches the casino aesthetic by default.
- Component naming follows Nuxt UI convention (`<UButton>`, `<USelect>`, `<UCard>`, etc.).
- If Nuxt UI ever becomes a constraint, individual components can be replaced with custom implementations. The game-critical components (table, dice, chips) are already custom.
