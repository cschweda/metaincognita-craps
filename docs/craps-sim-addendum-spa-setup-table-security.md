# Craps Simulator — Addendum: SPA Clarification, Setup Page, Table Rendering & Security

This document addresses the open questions and adds the missing specifications. All of this content should be folded into the relevant phase docs when building the LLM Build Prompt (Doc 07).

---

## 1. SPA vs. Static Site — Clarification

The docs inconsistently use "static site" and "SPA." Here's the precise answer:

**This is an SPA (Single-Page Application) deployed as static files.** It is NOT a statically pre-rendered multi-page site. The distinction:

- **`ssr: false`** means Nuxt produces a client-side-only SPA. No server-side rendering. No pre-rendering of routes. The browser receives an empty HTML shell, loads the JS bundle, and Vue renders everything client-side.
- **`nuxt generate`** outputs that SPA as static files (one `index.html` + hashed JS/CSS) that can be deployed to any static host (Netlify CDN).
- **"Static" refers to the hosting model** (no Node.js server at runtime), not to the content being pre-rendered. The app is fully dynamic — it just doesn't need a server.

This is identical to how the Hold'em Simulator works. The Netlify `[[redirects]]` rule (`/* → /index.html`) is required because there's only one HTML file — all routing is client-side.

**Corrected language for all docs:** Replace "static site" with "SPA deployed as static files on Netlify" or just "SPA on Netlify." Remove any reference to "static site generation" or "pre-rendering."

### Route Structure

The craps simulator has **two routes** (unlike the Hold'em simulator's single route):

```
/         → Setup page (configure game, pick bots, set table rules)
/table    → The game table (play craps)
```

The setup page is the entry point. After configuration, the user navigates to `/table`. The game state initializes from the setup configuration stored in Pinia (which survives the client-side route change since there's no page reload).

The user can return to `/` (setup) at any time — this resets the game. A confirmation dialog prevents accidental navigation away from an active session.

---

## 2. Version Pinning

**Nuxt:** 4.x (stable, currently 4.4.x as of March 2026). The docs should specify `"nuxt": "^4.4.0"` in `package.json`, not a fixed minor. Nuxt 4 is production-stable; Nuxt 5 is forthcoming but not yet released.

**Nuxt UI:** 4.6.x (stable, latest as of March 2026). Specify `"@nuxt/ui": "^4.6.0"`. Nuxt UI v4 merged Nuxt UI and Nuxt UI Pro into a single free open-source library with 100+ components.

**Tailwind CSS:** v4.x (ships with Nuxt UI v4).

**Vue:** 3.x (ships with Nuxt 4).

**Pinia:** Ships with Nuxt 4 (no separate install needed).

**Package manager:** Yarn 1.22.22.

The `nuxt.config.ts` in all docs should be updated to reflect Nuxt 4's `app/` directory convention:

```
craps-simulator/
├── app/
│   ├── app.vue
│   ├── app.config.ts
│   ├── pages/
│   │   ├── index.vue        ← Setup page
│   │   └── table.vue        ← Game table
│   ├── components/
│   ├── composables/
│   ├── stores/
│   ├── utils/
│   └── assets/
├── craps.config.ts
├── nuxt.config.ts
├── package.json
├── netlify.toml
├── tests/
└── yarn.lock
```

---

## 3. Setup Page Specification

The setup page (`app/pages/index.vue`) is the first thing the user sees. It mirrors the Hold'em simulator's setup screen: a full-page configuration UI that initializes the game state before navigating to the table.

### Layout

Dark background (casino feel). Centered card layout, max-width ~800px. Nuxt UI components throughout (UCard, USelect, USlider, UButton, URadioGroup, UAccordion for expandable sections).

### Section 1: Hero Configuration

- **Hero name** — text input, defaults to "Hero." `<UInput>` with placeholder.
- **Starting bankroll** — slider + numeric input, tied to the selected stake level. Range: 0.5× to 5× the default bankroll for the stake. `<USlider>` with `<UInput type="number">` override.

### Section 2: Table Stakes

Radio group or card selector with 5 stake levels:

| Level | Name | Min Bet | Max Bet | Default Bankroll | Odds Multiple |
|-------|------|---------|---------|------------------|---------------|
| 1 | Low Roller | $5 | $500 | $200 | 3-4-5× |
| 2 | Standard | $10 | $2,000 | $500 | 3-4-5× |
| 3 | Mid Stakes | $25 | $5,000 | $2,000 | 5× |
| 4 | High Roller | $100 | $10,000 | $5,000 | 10× |
| 5 | Whale | $500 | $50,000 | $25,000 | 20× |

Default: Level 2 (Standard). Selecting a level updates the bankroll slider range and default.

Each stake card shows: level name, blind range, default bankroll, odds multiple. Highlighted selection with casino-dark styling — gold border on selected card.

### Section 3: Table Rules (Expandable)

Collapsible `<UAccordion>` section labeled "Table Rules" — collapsed by default (most users won't change these).

- **Odds multiple:** `<USelect>` — 1×, 2×, 3-4-5× (default), 5×, 10×, 20×, 100×.
- **Field 12 payout:** `<URadioGroup>` — "Double (2:1)" or "Triple (3:1, default)."
- **Buy bet vig:** `<URadioGroup>` — "Charged on every buy" or "Charged on wins only (default)."
- **Hardways on come-out:** `<UToggle>` — "Working" or "Off (default)."
- **Payout rounding:** `<USelect>` — "Round down to dollar (default)", "Round down to $0.25", "Exact (to the penny)." All three options use `Math.floor` — they differ only in the minimum chip denomination, not the rounding direction. "Exact" means pay to the penny (still floored), not that rounding is disabled.

### Section 4: Bot Co-Bettors

- **Number of bots:** `<USlider>` or stepper, 0–7. Default: 3.
- **Bot strategy assignment:** When bots > 0, a list of bot slots appears. Each shows:
  - Bot name (auto-assigned from strategy persona name).
  - Strategy dropdown (`<USelect>`) — the 8 strategies.
  - Bankroll (same as hero's starting bankroll by default; optionally adjustable).
- **"Randomize All"** button — shuffles strategy assignments.
- **"Clear All"** button — sets bots to 0.
- Default: 3 bots with randomly assigned strategies.

### Section 5: Play Button

Large, prominent green button at the bottom: **"Start Game"** or **"Take a Seat"**.

Clicking this:
1. Validates configuration (hero name not empty, bankroll > 0).
2. Initializes the Pinia store (`useCrapsStore`) with all configured values.
3. Navigates to `/table` via `navigateTo('/table')`.

### Section 6: Returning to Setup

From the game table, a "Settings" or "New Game" button in the top bar navigates back to `/`. This triggers a confirmation dialog: "Leave the table? Your current session will end." If confirmed, the store resets and the user returns to setup.

### Session Persistence

When a game session is active, the store state is saved to localStorage. If the user refreshes on `/table`, the game reloads from localStorage. If the user navigates to `/` (setup), the session is cleared.

On first load (no localStorage session), the user always starts at `/`. If there IS a saved session and the user navigates to `/table` directly, the game resumes.

---

## 4. How the Craps Table Is Drawn

### Rendering Approach: SVG with Interactive Overlay

The table is rendered as a **single SVG element** with CSS-styled interactive overlays for bet placement. This approach is chosen over pure CSS/HTML because:

1. **SVG is resolution-independent** — scales perfectly on any screen size.
2. **The table has complex curved geometry** (Pass Line curves, rail curves, rounded corners) that SVG handles natively via `<path>` and `<ellipse>`.
3. **Each betting area is a named SVG group (`<g>`)** with a unique ID, enabling precise click targets and programmatic chip placement.
4. **Text labels, payout ratios, and dice images in proposition boxes** are all SVG-native.

### Table Anatomy (Zone-by-Zone)

The SVG table is structured as nested groups. Here is the complete zone inventory — every zone that must exist for the table to be accurate:

#### Wing Section (one side — hero's side; the other side is a mirror for visual symmetry but not interactive)

**Layer 1 — Outermost (closest to player):**

| Zone ID | Label | Shape | Notes |
|---------|-------|-------|-------|
| `pass-line` | PASS LINE | L-shaped curve running along the entire bottom and right edge of the wing | Largest betting area. Widest part at the bottom. |
| `dont-pass` | DON'T PASS BAR | Narrow strip above/inside the Pass Line curve | Text: "Don't Pass Bar" with small "12" in circle (bar 12). |

**Layer 2 — Come / Don't Come:**

| Zone ID | Label | Shape | Notes |
|---------|-------|-------|-------|
| `come` | COME | Large rectangle in the center of the wing | Text: "COME" |
| `dont-come` | DON'T COME BAR | Narrow strip above Come | Text: "Don't Come Bar" with "12" bar indicator. |

**Layer 3 — Field:**

| Zone ID | Label | Shape | Notes |
|---------|-------|-------|-------|
| `field` | FIELD | Wide rectangle between Come and number boxes | Text: "FIELD" with numbers "2 • 3 • 4 • 9 • 10 • 11 • 12" displayed. The 2 and 12 circled to indicate bonus payouts. |

**Layer 4 — Number Boxes (top of wing):**

| Zone ID | Label | Payout Text | Notes |
|---------|-------|-------------|-------|
| `place-4` | 4 | — | Box number |
| `place-5` | 5 | — | Box number |
| `place-six` | SIX | — | Spelled out (casino convention to prevent confusion with 9) |
| `place-8` | 8 | — | Box number |
| `place-nine` | NINE | — | Spelled out |
| `place-10` | 10 | — | Box number |

Each number box has sub-zones for: the main Place bet area, a Buy bet indicator area (top), and a Lay bet indicator area (above the box). The ON/OFF puck sits on top of the point number when active.

**Layer 5 — Corners:**

| Zone ID | Label | Notes |
|---------|-------|-------|
| `big-6` | BIG 6 | Bottom-left corner of number box area |
| `big-8` | BIG 8 | Bottom-right corner of number box area |

#### Center Section (Proposition Bets — Shared)

The center section is a dense grid between the two wings. It contains:

| Zone ID | Label | Payout Text | Notes |
|---------|-------|-------------|-------|
| `hard-4` | Hard 4 | 7:1 | Shows dice image: ⚁⚁ (2+2) |
| `hard-6` | Hard 6 | 9:1 | Shows dice image: ⚂⚂ (3+3) |
| `hard-8` | Hard 8 | 9:1 | Shows dice image: ⚃⚃ (4+4) |
| `hard-10` | Hard 10 | 7:1 | Shows dice image: ⚄⚄ (5+5) |
| `any-seven` | Any Seven | 4:1 | |
| `any-craps` | Any Craps | 7:1 | Shows dice combos for 2, 3, 12 |
| `aces` | Aces (Snake Eyes) | 30:1 | Shows ⚀⚀ |
| `ace-deuce` | Ace Deuce | 15:1 | Shows ⚀⚁ |
| `yo-eleven` | Yo (Eleven) | 15:1 | Shows ⚄⚅ |
| `boxcars` | Boxcars (Midnight) | 30:1 | Shows ⚅⚅ |
| `craps-eleven` | C & E | 3:1 / 7:1 | Split box |
| `horn` | Horn | 30:1 / 15:1 | 4-way split box |

### Validation Checklist: Is the Table Complete?

The build process should include an automated test that verifies:

1. **Every BetType in the `BetType` enum has a corresponding SVG zone ID.** If a bet type exists in the engine but has no table zone, the test fails.
2. **Every SVG zone ID has a click handler wired.** If a zone exists visually but has no interaction, the test fails.
3. **Payout text on the table matches `craps.config.ts` payout ratios.** If the config says Place 6 pays 7:6 but the SVG text says "7 to 5," the test fails.
4. **All "TO" vs "FOR" payout notation is consistent.** The table uses "TO" notation throughout (standard for modern casinos). 30:1 means "30 TO 1" (win $30 on a $1 bet, keep your $1). Not "30 FOR 1" (win $30, lose your $1, net $29).
5. **Six and Nine are spelled out** (SIX, NINE) to prevent upside-down confusion.
6. **The ON/OFF puck has both visual states and positions for every point number (4, 5, 6, 8, 9, 10).**
7. **The Field area displays all winning numbers with correct bonus indicators** (2 and 12 circled or highlighted to show bonus payouts).
8. **The Don't Pass and Don't Come bars show the bar-12 indicator.**

This checklist becomes a Vitest test suite: `tests/table-completeness.test.ts`.

### Interactive Behavior

Each SVG zone has:
- **Default state:** Flat felt color with white/cream text labels.
- **Hover state:** Subtle glow/highlight (CSS `:hover` on the `<g>` element, or pointer events captured in Vue).
- **Disabled state:** Grayed out with reduced opacity when the bet is invalid for the current game state (e.g., Come area during come-out).
- **Active bet state:** Chip stack SVG element placed at the zone's center point. Bet amount label above/below.
- **Working/Off indicator:** Small lammer circle (white = ON, dark = OFF) on discretionary bets.

### Responsive Scaling

The SVG `viewBox` defines the logical coordinate space (e.g., `0 0 1200 600`). The actual rendered size is controlled by CSS `width: 100%` on the container, so it scales proportionally. The minimum readable size is enforced by a CSS `min-width` on the table container.

On mobile (<768px), the center proposition section can be hidden by default and accessed via a "Props" button that opens a `<UModal>` or `<USlideover>` with a simplified grid of proposition bet buttons.

---

## 5. Security (Reference Copy)

> **Note:** This section is a reference copy of Doc 06 (Security), included here for convenience during the Addendum review. **Doc 06 is the authoritative security document.** If any discrepancy exists between this section and Doc 06, Doc 06 takes precedence. Do not update security policy here — update Doc 06 and propagate changes.

## Threat Model

The craps simulator is a client-side SPA with no server, no authentication, no user accounts, and no real money. The attack surface is minimal — but there are still red team / blue team considerations worth documenting, especially for a tool deployed publicly.

### What's NOT at Risk
- **No server to compromise.** Netlify serves static files from a CDN. There is no backend, no API, no database, no server-side code at runtime.
- **No user credentials.** No auth, no login, no session tokens. (Future Supabase integration would change this — see Future Considerations below.)
- **No real money.** All currency is simulated. There's no payment processing, no financial data.
- **No PII collection.** The hero name is stored in localStorage only. No tracking, no analytics, no cookies (beyond Nuxt UI's color mode preference).

### What IS at Risk

#### 1. RNG Integrity (Red Team: Predictable Dice)

**Threat:** `Math.random()` is not cryptographically secure. A sophisticated attacker could predict the PRNG state from observed outputs and predict future dice rolls.

**Assessment:** For a learning tool with no real money, this is a non-issue. `Math.random()` is statistically uniform (verified by chi-squared tests) and adequate for simulation purposes. Predicting dice rolls gains the attacker nothing — they'd be "cheating" against a free educational tool.

**Blue Team Response:** Document that `Math.random()` is intentionally chosen for simplicity and performance. If future versions add competitive features (leaderboards, tournaments with prizes), upgrade to `crypto.getRandomValues()`:

```typescript
function secureRoll(): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0] % 6) + 1
}
```

Note: The modulo approach has a negligible bias for values not evenly dividing 2^32. For dice (6 values), the bias is 4/4,294,967,296 ≈ 0.00000009% — irrelevant.

#### 2. localStorage Tampering (Red Team: Inflated Stats)

**Threat:** A user can open DevTools and modify their localStorage to fake stats (bankroll, win rate, longest shooter, etc.).

**Assessment:** No impact. The user is only "cheating" themselves. There's no leaderboard, no shared state, no competition.

**Blue Team Response:** None needed for v1. If competitive features are added later, stats must move server-side (Supabase). Client-side storage is inherently untrustable for competitive integrity.

#### 3. XSS via Hero Name (Red Team: Script Injection)

**Threat:** The hero name is user-supplied and displayed in the UI. If rendered with `v-html` or interpolated into a template without escaping, an attacker could inject `<script>` tags or event handlers.

**Blue Team Response:**
- **Never use `v-html`** for any user-supplied content.
- Vue's default template interpolation (`{{ heroName }}`) auto-escapes HTML. This is sufficient.
- The hero name should be sanitized on input: strip HTML tags, limit length (32 chars), allow only alphanumeric + spaces + basic punctuation.

```typescript
function sanitizeName(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim().slice(0, 32)
}
```

#### 4. Dependency Supply Chain (Red Team: Compromised npm Package)

**Threat:** A malicious update to a dependency (Nuxt, Nuxt UI, or a transitive dependency) could inject code into the build.

**Blue Team Response:**
- **`yarn.lock` pinning:** The lockfile pins exact versions. Always commit `yarn.lock`. Never run `yarn upgrade` without reviewing changes.
- **Minimal dependencies.** The simulator has very few direct dependencies (Nuxt, Nuxt UI, Pinia). Fewer packages = smaller attack surface.
- **Netlify build from lockfile.** The Netlify build uses `yarn install --frozen-lockfile`, which refuses to install if the lockfile doesn't match `package.json`. This prevents silent dependency changes.
- **No CDN script tags.** All code is bundled at build time. No runtime loading of external scripts.

#### 5. Netlify Deployment Security (Red Team: Compromised Deploy)

**Threat:** An attacker gains access to the Netlify account or GitHub repo and deploys a modified build.

**Blue Team Response:**
- **GitHub branch protection.** Require PR reviews for merges to `main`.
- **Netlify deploy previews.** Every PR gets a preview deploy. Review before merging.
- **No environment variables with secrets.** The SPA has no secrets — no API keys, no tokens, no server-side config. Everything is public client-side code.
- **Content Security Policy (CSP).** Add a CSP header in `netlify.toml` that restricts script sources:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"
```

Note: `'unsafe-inline'` for styles is required by Tailwind CSS's runtime style injection. If Tailwind is fully compiled at build time (which it should be with Nuxt 4), this can be tightened.

#### 6. Clickjacking (Red Team: Iframe Embedding)

**Threat:** An attacker embeds the simulator in an iframe on a malicious site to trick users into interacting with it in a misleading context (e.g., "Win real money playing craps!").

**Blue Team Response:** The `X-Frame-Options: DENY` header (above) prevents iframe embedding entirely.

#### 7. Open Redirect / URL Manipulation (Red Team: Malicious Navigation)

**Threat:** Since it's an SPA with client-side routing, an attacker could craft a URL that navigates to a malicious route or injects parameters.

**Assessment:** The app has exactly two routes (`/` and `/table`). Vue Router's `createRouter` only recognizes declared routes. Unknown routes should redirect to `/`. No query parameters are used for state initialization (state comes from Pinia/localStorage, not URLs).

**Blue Team Response:**
- Define a catch-all route that redirects to `/`:
```typescript
{ path: '/:pathMatch(.*)*', redirect: '/' }
```
- Never use URL query parameters to initialize game state.

### Future Considerations (If Supabase Is Added)

If persistent roll history via Supabase is added in a future phase:

- **Row-Level Security (RLS):** Every Supabase table must have RLS enabled. Users can only read/write their own data.
- **Auth:** Use Supabase Auth with magic link or GitHub OAuth. Never store passwords.
- **API keys:** Supabase `anon` key is safe to expose in client-side code (it's designed for this). The `service_role` key must NEVER be in client code.
- **Rate limiting:** Supabase handles this at the API level, but the client should also debounce writes (e.g., save session stats at most once per 30 seconds, not after every roll).
- **Data validation:** All writes to Supabase should be validated server-side (Supabase Postgres functions / RLS policies) to prevent fabricated stats.

### Security Checklist for Each Phase Build

| Phase | Security Check |
|-------|---------------|
| 1 | Hero name input sanitized. No `v-html` anywhere. |
| 2 | RNG uses `Math.random()` — document as intentional choice. Integer arithmetic prevents payout manipulation via float exploits. |
| 3 | localStorage writes are JSON.stringify'd with try/catch. Corrupted localStorage handled gracefully (reset to defaults, don't crash). |
| 4 | Bot strategies are deterministic — no user input affects bot behavior. Bot names are hardcoded, not user-supplied. |
| 5 | Stats panel displays data from Pinia store, not directly from localStorage. Store validates data shape on load. |
| 6 | CSP headers added to `netlify.toml`. X-Frame-Options: DENY. Catch-all route redirect. |

---

## Summary of Changes Needed Across Docs

| Doc | Change |
|-----|--------|
| **All** | Replace "static site" with "SPA deployed as static files on Netlify." |
| **All** | Update version references: Nuxt 4.4+, Nuxt UI 4.6+. |
| **Doc 00** | Add two-route structure (`/` setup, `/table` game). Add `app/` directory convention. |
| **Doc 01** | Add full Setup Page specification (Section 3 above). Clarify table is SVG-based. Add table zone inventory and completeness checklist. |
| **Doc 02** | Fix BUG 1 (vig-on-bet payout base), BUG 2 (vig rounding direction), per audit report. |
| **Doc 05** | Fix BUG 3 (expected rolls for 6-point). Address GAP 1 (cost-of-fun resolution frequency). |
| **New Doc 06** | Security document (Section 5 above). |
