# Craps Simulator — Doc 00: Master Design Document

## Project Overview

A browser-based casino craps simulator with a single hero player, configurable table rules, a complete bet management engine covering every standard casino craps wager, bot co-bettors with exploitable betting system personalities, real-time probability/EV analysis, and a live stats/advisor panel. Deployed as a static site on Netlify. Designed as a learning tool: the simulator teaches players which bets are mathematically sound, which are sucker bets, and why — by letting them see the math play out in real time across hundreds of rolls.

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Nuxt 4 (`ssr: false`) | Default stack. `ssr: false` + `nuxt generate` produces a static SPA — single `index.html` shell + hashed JS/CSS assets. No server-side rendering, no hydration. Identical architecture to the Hold'em Simulator. |
| **UI** | Nuxt UI v4 | Base components (buttons, sliders, dropdowns, modals, tooltips, color-mode toggle). Craps-specific visuals (table, dice, chips, puck) are custom. |
| **Styling** | Tailwind CSS (via Nuxt UI) | Utility-first, fast iteration. Nuxt UI's color mode system handles light/dark theming. |
| **Package manager** | Yarn 1.22.22 | Preferred package manager. |
| **Deployment** | Netlify (static site) | `yarn generate` → deploy `.output/public/` folder. Zero server, zero cost for static. |
| **State management** | Pinia (single store) | One `useCrapsStore` with the full game state. Pinia ships with Nuxt 4. |
| **Persistence (Phase 1)** | `localStorage` | Session stats (rolls, wins, bankroll history) persist across browser refreshes. No backend needed. |
| **Persistence (Future)** | Supabase or local IndexedDB | Store full roll histories — every bet, every roll, every payout. Supabase subscription already available. See Future Enhancements. |

### SPA Mode — Same Rationale as Hold'em

- **No SEO need.** It's a game — search engines don't need to index dice rolls.
- **No server data.** Dice generation, bet resolution, bot strategy, and probability calculations all run in the browser.
- **Hydration risk eliminated.** Complex client state (active bets, animation queues, puck state) + SSR = mismatch bugs. With `ssr: false`, state is born client-side and stays there.
- **First paint tradeoff is acceptable.** A craps table is an interactive canvas that needs JS loaded before anything meaningful renders.

### Aesthetic Direction

Casino-dark luxury — deep emerald felt, walnut rail with padded armrest ridge, gold/cream accents, crisp white dice with red pips, stacked chip towers. Typography: a distinctive display font for roll totals and payout amounts, a clean sans-serif for stats and controls.

**Light/dark mode:** The app supports light and dark themes via Nuxt UI's built-in `useColorMode()` composable and `<UColorModeToggle>` component. The theme switch affects the entire UI — stats panel, setup screen, controls, bet placement areas, chip labels, and all chrome. **Exception: the craps table felt stays dark emerald green in both modes.** The felt is the felt — it doesn't change with the theme. The walnut rail, rubber pyramid wall, and inner shadow also remain consistent. Only the surrounding UI (sidebar, controls, overlays, text) adapts to light/dark.

---

## Craps Domain Model — How the Game Works

This section establishes the complete rules model. Every implementation detail in Phases 1–6 derives from this section. Getting this right is the entire game.

### The Dice

Two standard six-sided dice. 36 equally probable outcomes. The simulator rolls two independent uniform integers in [1,6] and sums them. Individual die values matter for hardway bets (e.g., hard 8 = 4+4, not 2+6 or 3+5).

| Total | Combinations | Probability | Ways |
|-------|-------------|-------------|------|
| 2 | 1+1 | 1/36 (2.78%) | 1 |
| 3 | 1+2, 2+1 | 2/36 (5.56%) | 2 |
| 4 | 1+3, 2+2, 3+1 | 3/36 (8.33%) | 3 |
| 5 | 1+4, 2+3, 3+2, 4+1 | 4/36 (11.11%) | 4 |
| 6 | 1+5, 2+4, 3+3, 4+2, 5+1 | 5/36 (13.89%) | 5 |
| 7 | 1+6, 2+5, 3+4, 4+3, 5+2, 6+1 | 6/36 (16.67%) | 6 |
| 8 | 2+6, 3+5, 4+4, 5+3, 6+2 | 5/36 (13.89%) | 5 |
| 9 | 3+6, 4+5, 5+4, 6+3 | 4/36 (11.11%) | 4 |
| 10 | 4+6, 5+5, 6+4 | 3/36 (8.33%) | 3 |
| 11 | 5+6, 6+5 | 2/36 (5.56%) | 2 |
| 12 | 6+6 | 1/36 (2.78%) | 1 |

### Game Phases (The Puck)

The game has two phases, tracked by the ON/OFF puck:

**Puck OFF (Come-Out Phase):**
- The shooter is establishing a new point.
- Pass Line and Don't Pass bets may be placed.
- Come bets may NOT be placed (only Pass Line).
- Place bets, odds bets, and hardways are OFF by default (not at risk) unless the player explicitly requests them "working."
- Roll outcomes:
  - **7 or 11 ("Natural"):** Pass Line wins, Don't Pass loses. Shooter retains dice.
  - **2, 3, or 12 ("Craps"):** Pass Line loses. Don't Pass wins on 2 or 3; Don't Pass pushes on 12 (bar 12). Shooter retains dice.
  - **4, 5, 6, 8, 9, or 10:** That number becomes the Point. Puck flips to ON and moves to that number. Enter Point Phase.

**Puck ON (Point Phase):**
- The shooter is trying to hit the Point before rolling a 7.
- All bet types are available. Come/Don't Come bets may be placed. Odds may be added behind Pass/Don't Pass/Come/Don't Come.
- Place bets, hardways, and proposition bets are active ("working") by default.
- Roll outcomes:
  - **Point number:** Pass Line wins, Don't Pass loses. Puck goes OFF. New come-out roll (same shooter).
  - **7 ("Seven-Out"):** Pass Line loses, Don't Pass wins. All Place bets lose. All active Come bets with established points lose. Puck goes OFF. Dice pass to next shooter.
  - **Any other number:** Resolves Come/Don't Come bets, Place bets, Field bets, Proposition bets, and Hardway bets as applicable. Pass Line bet stays active. Shooter rolls again.

### Shooter Rotation

- The hero is always the primary shooter. When the hero sevens out, the dice "pass" to a bot shooter (visual indication only — the probability engine doesn't change). Bot shooters roll until they seven out, then dice pass to the next player clockwise. Hero can bet on all rolls regardless of who's shooting.
- **Optional future mode:** Hero-only shooter (dice never leave the hero). Simpler for beginners.

### Complete Bet Catalog

#### Category 1: Line Bets (Contract Bets — Cannot Be Removed After Point)

**Pass Line**
- Placed: Before come-out roll only.
- Come-out: Wins on 7/11, loses on 2/3/12.
- Point phase: Wins if Point rolls before 7, loses if 7 rolls first.
- Payout: Even money (1:1).
- House edge: 1.414% (exactly 7/495).
- Contract: Cannot be removed or reduced after point is established.

**Don't Pass (Bar 12)**
- Placed: Before come-out roll only.
- Come-out: Wins on 2/3, pushes on 12, loses on 7/11.
- Point phase: Wins if 7 rolls before Point, loses if Point rolls first.
- Payout: Even money (1:1).
- House edge: 1.364% (counting ties as action) or 1.403% (excluding ties).
- Contract: CAN be removed after point (but shouldn't be — the math favors the player once a point is established). The simulator should flag this in the advisor: "You can take this down, but you'd be giving up your edge."

**Come**
- Placed: During point phase only (after a point is established).
- Behaves exactly like a Pass Line bet but starting fresh on the next roll.
- First roll after placement: Wins on 7/11, loses on 2/3/12, otherwise establishes a Come Point.
- The dealer moves the chip from the COME area to the corresponding number box.
- Subsequent rolls: Wins if Come Point rolls before 7, loses on 7.
- Payout: Even money (1:1).
- House edge: 1.414%.
- Contract: Cannot be removed after Come Point is established.

**Don't Come**
- Placed: During point phase only.
- Behaves exactly like Don't Pass but starting fresh.
- First roll: Wins on 2/3, pushes on 12, loses on 7/11, otherwise establishes a Don't Come Point.
- Subsequent rolls: Wins if 7 rolls before Don't Come Point, loses if Point rolls first.
- Payout: Even money (1:1).
- House edge: 1.364%.
- Contract: CAN be removed (same advisor warning as Don't Pass).

#### Category 2: Odds Bets (True Odds — Zero House Edge)

The single best bet in any casino. Pays at true mathematical odds with NO house edge. Can only be placed behind an existing line bet (Pass, Don't Pass, Come, Don't Come) after a point is established.

**Pass/Come Odds ("Taking Odds")**
- Placed: Behind Pass Line or on a Come Point number, after point is established.
- Wins/loses with the underlying line bet.
- Payouts (true odds):
  - Point 4 or 10: Pays 2:1
  - Point 5 or 9: Pays 3:2
  - Point 6 or 8: Pays 6:5
- House edge: 0.000%.
- Maximum: Configurable (1×, 2×, 3-4-5×, 5×, 10×, 20×, 100×). Default: 3-4-5× (3× on 4/10, 4× on 5/9, 5× on 6/8 — designed so a max odds win always pays 6× the flat bet).

**Don't Pass/Don't Come Odds ("Laying Odds")**
- Placed: Behind Don't Pass or Don't Come after point is established.
- Wins/loses with the underlying don't bet.
- Payouts (true odds, inverted):
  - Point 4 or 10: Pays 1:2
  - Point 5 or 9: Pays 2:3
  - Point 6 or 8: Pays 5:6
- House edge: 0.000%.
- Maximum: Configured such that the WIN amount matches the pass-side maximum. With 3-4-5× odds: lay 6× on 4/10, 6× on 5/9, 6× on 6/8.
- **Bet sizing constraint:** Lay odds must produce a whole-unit payout. The simulator should auto-snap to valid amounts.

#### Category 3: Place Bets

Bet that a specific number (4, 5, 6, 8, 9, or 10) will roll before 7. Can be placed, removed, increased, or decreased at any time.

| Number | True Odds | Payout | House Edge |
|--------|-----------|--------|------------|
| 4 or 10 | 2:1 | 9:5 | 6.67% |
| 5 or 9 | 3:2 | 7:5 | 4.00% |
| 6 or 8 | 6:5 | 7:6 | 1.52% |

- **Working status:** OFF on come-out rolls by default. Player can toggle ON/OFF per bet.
- **Bet sizing:** Place 6 and Place 8 should be in multiples of $6 (pays 7:6). Place 5 and Place 9 in multiples of $5 (pays 7:5). Place 4 and Place 10 in multiples of $5 (pays 9:5). The simulator should warn/auto-correct improper sizing.
- Lose on 7.

#### Category 4: Buy and Lay Bets

**Buy Bets:** Same as Place bets but pay at true odds, with a 5% commission (vig).

| Number | True Odds Payout | Commission | House Edge (vig on bet) | House Edge (vig on win) |
|--------|-----------------|------------|-------------------------|-------------------------|
| 4 or 10 | 2:1 | 5% of bet | 4.76% | 1.67% |
| 5 or 9 | 3:2 | 5% of bet | 4.76% | 2.00% |
| 6 or 8 | 6:5 | 5% of bet | 4.76% | 2.27% |

- **Vig timing is configurable:** Some casinos charge on every buy, some only on wins. Default: vig on win only for 4/10.
- Buy 4/10 with vig-on-win is strictly better than Place 4/10 (1.67% vs. 6.67%). The advisor should flag this.

**Lay Bets:** Opposite of Buy — bet that 7 rolls before a specific number. Pay at inverse true odds with 5% commission on win amount.

| Number | Payout | House Edge (vig on win) |
|--------|--------|------------------------|
| 4 or 10 | 1:2 | 2.44% |
| 5 or 9 | 2:3 | 3.23% |
| 6 or 8 | 5:6 | 4.00% |

#### Category 5: Field Bet (One-Roll)

Wins on 2, 3, 4, 9, 10, 11, 12. Loses on 5, 6, 7, 8. One-roll bet — resolved immediately.

- Standard payout: Even money, except 2 pays 2:1 and 12 pays 2:1. House edge: 5.56%.
- Better payout (configurable): 2 pays 2:1 and 12 pays 3:1 (or vice versa). House edge: 2.78%.
- Default: 2:1/3:1 variant (most common on the Strip).

#### Category 6: Proposition Bets (Center of Table)

High house-edge, one-roll bets. Included specifically as teaching tools.

| Bet | Wins On | True Odds | Payout | House Edge |
|-----|---------|-----------|--------|------------|
| Any 7 | 7 | 5:1 | 4:1 | 16.67% |
| Any Craps | 2, 3, or 12 | 8:1 | 7:1 | 11.11% |
| Aces (Snake Eyes) | 2 | 35:1 | 30:1 | 13.89% |
| Boxcars (Midnight) | 12 | 35:1 | 30:1 | 13.89% |
| Ace-Deuce | 3 | 17:1 | 15:1 | 11.11% |
| Yo (Eleven) | 11 | 17:1 | 15:1 | 11.11% |
| C & E (Craps-Eleven) | 2,3,12 or 11 | — | 3:1 on craps, 7:1 on 11 | 11.11% |
| Horn | 2,3,11,12 | — | 30:1 on 2/12, 15:1 on 3/11 (less 3-unit loss) | 12.50% |
| Horn High | 2,3,11,12 | — | 5-unit bet: 4 units as Horn + 1 extra on player's chosen number. Paid as individual bets per MBS 3.4.15. | 12.50% |
| Hop Bet (easy) | Specific non-pair combo | 17:1 | 15:1 | 11.11% |
| Hop Bet (hard) | Specific pair combo | 35:1 | 30:1 | 13.89% |

**Multi-Roll Propositions (Hardways):**

| Bet | Wins On | Loses On | Payout | House Edge |
|-----|---------|----------|--------|------------|
| Hard 4 (2+2) | 2+2 before 7 or easy 4 | 7 or any other 4 | 7:1 | 11.11% |
| Hard 6 (3+3) | 3+3 before 7 or easy 6 | 7 or any other 6 | 9:1 | 9.09% |
| Hard 8 (4+4) | 4+4 before 7 or easy 8 | 7 or any other 8 | 9:1 | 9.09% |
| Hard 10 (5+5) | 5+5 before 7 or easy 10 | 7 or any other 10 | 7:1 | 11.11% |

- **Working status:** OFF on come-out rolls by default (configurable).

#### Category 7: Big 6 / Big 8

Even money on 6 or 8 before 7. House edge: 9.09%. Mathematically identical to Place 6/8 but with worse payout. Exists purely as a sucker bet / teaching tool.

### Payout Rounding

Casinos round payouts DOWN to the nearest chip denomination (`Math.floor`). This is Vegas convention and the canonical default for this simulator. The rounding direction is always DOWN — it is not configurable. The `payoutRounding` table rule controls only the **minimum chip denomination** (dollar, quarter, or penny), not the direction. Colorado Division of Gaming rounds UP per 30-2306(4), but this is a jurisdictional variant we document without implementing. The simulator warns when bet sizing causes rounding losses.

### Working / Not Working (ON/OFF Lammers)

Per MBS Rules 3.4.9, 3.4.11, 3.4.12, 3.16.2, 3.17:

- **Default come-out behavior:**
  - Pass Line odds: OFF. Hero can request ON.
  - Come bet odds: OFF. Hero can request ON.
  - Don't Come bets (flat): Always ON. Can be removed by player but never increased or replaced once removed (MBS 3.16.1, 3.16.2).
  - Don't Come odds: Always ON (they benefit from a 7 on come-out).
  - Place bets: OFF. Hero can request ON.
  - Buy bets: OFF. Hero can request ON. If a Buy bet is taken down before the next roll, the vigorish is refunded (MBS 3.4.10.1).
  - Lay bets: Always ON (unlike Place/Buy, Lay bets are always working on every roll, including come-out, unless the player explicitly calls them OFF) (MBS 3.4.11).
  - Hardways: OFF by default (configurable per table rules).
  - Proposition (one-roll) bets: Always ON.
  - Field bets: Always ON (one-roll).

- **Player control:** The hero can toggle any discretionary bet ON or OFF at any time.

### Don't Pass / Don't Come Removal Rules

Per MBS Rule 3.16.1: Don't Pass and Don't Come wagers may be removed or reduced at any time, but **may not be replaced or increased** after such removal or reduction. This is a critical constraint — the simulator must enforce that once a Don't Pass or Don't Come bet is reduced or removed, the player cannot put it back or raise it. The advisor should warn: "You can take this down, but you'd be giving up your edge — and you can't put it back."

### Canonical Rules Reference

The authoritative rules source for this simulator is the **Marina Bay Sands Craps Game Rules (Version 3)**, approved by the Gambling Regulatory Authority of Singapore (27 February 2020). This government-approved document defines every bet type, payout, working/off default, contract vs. non-contract status, and irregularity rule with legal precision. It is included in the repo as `app/assets/reference/MBS-Craps-Game-Rules-Version-3.pdf` and serves as the tie-breaker for any ambiguity in the design docs.

**Additional reference:** Colorado Division of Gaming, Rule 23 — Rules for Craps (1 CCR 207-1-23), published via Cornell Law Institute: `https://www.law.cornell.edu/regulations/colorado/1-CCR-207-1-23`. This is US state law defining every permissible craps wager, payout minimum, and table procedure. All payouts in our design docs match the Colorado regulations exactly. Notable: Colorado law requires payout rounding **up** to the nearest chip denomination (30-2306(4)), confirming that rounding direction varies by jurisdiction and our configurable table rule is correct.

---

## Architecture Notes

### Project Setup & Config

```bash
# Initialize
npx nuxi@latest init craps-simulator
cd craps-simulator
yarn install                        # Yarn 1.22.22
yarn add @nuxt/ui                   # Nuxt UI v4+
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,                        // SPA mode — no server rendering
  modules: ['@nuxt/ui'],            // Nuxt UI includes Tailwind + color mode
  colorMode: {
    preference: 'dark',              // default to dark (casino feel)
    fallback: 'dark',
  },
  app: {
    head: {
      title: 'Craps Simulator',
    },
  },
})
```

```bash
# Development
yarn dev                             # http://localhost:3000

# Production build (static SPA)
yarn generate                        # outputs to .output/public/
# Deploy .output/public/ to Netlify
```

**Netlify config (`netlify.toml`):**
```toml
[build]
  command = "yarn generate"
  publish = ".output/public"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### State Shape (Pinia Store — `useCrapsStore`)

```typescript
{
  // ─── Game State ─────────────────────────────────────────────
  phase: 'SETUP' | 'COME_OUT' | 'POINT_PHASE' | 'RESOLVING' | 'BETWEEN_ROLLS' | 'SEVEN_OUT',
  animating: boolean,
  point: number | null,
  puckState: 'ON' | 'OFF',
  shooterSeat: number,
  rollNumber: number,
  shooterRollCount: number,

  // ─── Dice ───────────────────────────────────────────────────
  currentRoll: {
    die1: number,
    die2: number,
    total: number,
    isHard: boolean,
  } | null,
  rollHistory: DiceRoll[],

  // ─── Bets ───────────────────────────────────────────────────
  activeBets: ActiveBet[],
  lastResolutions: BetResolution[],

  // ─── Table Rules ────────────────────────────────────────────
  tableRules: {
    minBet: number,
    maxBet: number,
    oddsMultiple: '1x' | '2x' | '3-4-5x' | '5x' | '10x' | '20x' | '100x',
    fieldTwelvePayout: 2 | 3,
    buyVigTiming: 'on_bet' | 'on_win',
    hardwaysOnComeOut: boolean,
    payoutRounding: 'dollar' | 'quarter' | 'exact',
  },

  // ─── Players ────────────────────────────────────────────────
  players: {
    id: string,
    name: string,
    bankroll: number,          // integer cents
    startingBankroll: number,
    isHero: boolean,
    isBusted: boolean,
    strategy: BotStrategy | null,
    bankrollHistory: number[],
  }[],

  // ─── Session Stats (persisted to localStorage) ──────────────
  sessionStats: {
    rollsWitnessed: number,
    pointsEstablished: number,
    pointsMade: number,
    pointsMissed: number,
    totalWagered: number,
    totalProfitLoss: number,
    longestShooterRolls: number,
    betTypeStats: {
      [betType: string]: {
        timesPlaced: number,
        won: number,
        lost: number,
        pushed: number,
        totalWagered: number,
        netProfitLoss: number,
      }
    },
    bankrollHistory: number[],
  },
}
```

### Key Algorithms

| Algorithm | Approach | Complexity |
|-----------|----------|-----------|
| Dice generation | 2× independent uniform [1,6] | O(1) |
| Bet resolution | Iterate active bets, match against roll + state | O(n) where n = active bets |
| Payout calculation | Rational arithmetic on integer cents | O(1) per bet |
| House edge validation | 1M+ rolls, compare actual vs. theoretical per bet type | O(n) |
| Bot strategy | Deterministic state machine per system type | O(1) per roll |
| Working/off state | Check puck state + per-bet lammer + table rules | O(1) per bet |
| Come bet lifecycle | State machine: pending → point established → resolved | O(1) per roll |
| Shooter rotation | Circular index through players array | O(1) |

### Configuration File (`craps.config.ts`)

See Doc 02 for the full configuration file with payout tables, house edge reference values, odds multiples, bot strategies, and animation settings.

---

## Build Order Summary

| Phase | Focus | Deliverable | Doc |
|-------|-------|-------------|-----|
| **1** | Visual foundation | Table layout, dice, chips, puck, bet placement UI, setup screen | Doc 01 |
| **2** | Core engine | Dice generation, bet manager, resolver, payout calculator, statistical validation | Doc 02 |
| **3** | Game loop | Playable game with hero betting, rolling, payout animations, stickman calls | Doc 03 |
| **4** | Bot systems | 8 bot co-bettors with real betting strategies, bankroll tracking, bust-out | Doc 04 |
| **5** | Stats panel | Real-time EV analysis, per-bet-type breakdown, bot comparison dashboard | Doc 05 |
| **6** | Polish | Dice animation, chip movement, puck animation, responsive, hot shooter flair | Doc 05 (Section 6) |

Each phase produces a playable (or viewable) artifact. Phase 3 is the first "playable game," Phase 4 makes it educational through comparison, Phase 5 makes the math visible, Phase 6 makes it beautiful.

---

## Future Enhancements (Post-Phase 6)

- **Dice Control Mode:** Configurable distribution shift to show how even tiny frequency changes alter EV.
- **Strategy Lab:** Run 100K simulated rolls with a configured betting system — pure simulation, no animation.
- **Persistent Roll History (Supabase):** Cross-session analytics with auth.
- **Tournament Mode:** Fixed bankroll, fixed rolls, highest bankroll wins.
- **Tutorial / Guided Mode:** Step-by-step walkthrough for complete beginners.
- **California Craps (Card Craps):** Playing cards instead of dice variant.
- **Street Craps:** Player-vs-player, no banker.
- **Commentary System:** TV Broadcast-style dual commentary (reuse Hold'em architecture).

---

## 13-Document Design Suite — Index

| Doc | Title | Status |
|-----|-------|--------|
| **00** | Master Design (this document) | ✅ |
| **01** | Phase 1 — Table, Dice & Visual Foundation | ✅ |
| **02** | Phase 2 — Dice Engine & Bet Resolution | ✅ |
| **03** | Phase 3 — Game Loop & Hero Interaction | ✅ |
| **04** | Phase 4 — Bot Co-Bettors & Betting Systems | ✅ |
| **05** | Phase 5 — Stats Panel & Advisor + Phase 6 — Polish | ✅ |
| **06** | Security | ✅ |
| **07** | LLM Build Prompt | ✅ |
| **08** | Competitive Landscape / Differentiation | ✅ |
| **09** | Monorepo / Website | ✅ |
| **10** | Revision / Gap Analysis | ✅ |
| **11** | Architecture Decisions | ✅ |
| **12** | Use Cases | ✅ |
