# Craps Simulator

A browser-based casino craps training tool built with Nuxt 4 and Nuxt UI. Learn which bets are mathematically sound, which are sucker bets, and why — by watching the math play out in real time across hundreds of rolls.

## Features

- **Interactive SVG craps table** with all standard betting zones
- **Complete bet catalog** — 44 named bet types covering every standard casino craps wager
- **Mathematically verified engine** — integer-cent arithmetic, chi-squared validated dice, house edge convergence tests
- **8 bot co-bettors** with real betting strategies (Pass + Max Odds, Martingale, Iron Cross, Three-Point Molly, and more)
- **Real-time teaching advisor** — context-aware recommendations ranked by house edge with beginner-friendly explanations
- **Configurable table rules** — odds multiples (1x to 100x), field payouts, vig timing, payout rounding
- **Casino-dark aesthetic** — emerald felt, walnut rail, animated dice, stacked chips

## Rules Reference

Game rules are cross-validated against multiple authoritative sources:

| Source | Type | Link |
|--------|------|------|
| **Marina Bay Sands Craps Game Rules (Version 3)** | Government-approved casino rules (Singapore GRA) | [MBS-Craps-Game-Rules-Version-3.pdf](docs/MBS-Craps-Game-Rules-Version-3.pdf) |
| **Colorado Division of Gaming Rule 23** | US state law — 44 named bet types, payout rules | [1 CCR 207-1-23 (Cornell Law)](https://www.law.cornell.edu/regulations/colorado/1-CCR-207-1-23) |
| **Wikimedia Commons Craps Table Layout** | Reference SVG for table geometry (CC BY-SA 3.0) | [Craps_table_layout.svg](docs/Craps_table_layout.svg) |

The MBS document is the canonical (tie-breaking) reference for all bet resolution, working/off rules, and edge cases. See the [Rules Reference Sources](docs/craps-sim-rules-reference-sources.md) design doc for the full cross-validation analysis.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | [Nuxt 4](https://nuxt.com) (`ssr: false` — client-side SPA) |
| UI | [Nuxt UI v4](https://ui.nuxt.com) + [Tailwind CSS v4](https://tailwindcss.com) |
| State | [Pinia](https://pinia.vuejs.org) (single store) |
| Language | TypeScript (strict) |
| Testing | [Vitest](https://vitest.dev) |
| Deployment | [Netlify](https://netlify.com) (static) |

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
pnpm generate
```

Output goes to `.output/public/` for static deployment.

## Testing

```bash
pnpm test
```

The test suite includes:
- Dice distribution chi-squared uniformity test (100K+ rolls)
- House edge convergence tests for every bet type
- Payout precision tests with integer-cent arithmetic
- Come bet lifecycle state machine tests
- Seven-out cascade resolution tests

## Project Structure

```
app/
├── pages/           # Setup (/) and Table (/table)
├── components/
│   ├── setup/       # Setup page components
│   ├── table/       # Game table components
│   └── stats/       # Advisor & stats panel
├── composables/     # Game engine (dice, bets, payouts, game loop, advisor)
├── stores/          # Single Pinia store (useCrapsStore)
└── utils/           # BetType enum, formatting, sanitization
craps.config.ts      # Master config (stakes, payouts, odds, bots)
docs/                # 13-document design suite + MBS rules PDF
```

## Design Documentation

The `docs/` directory contains a 13-document design suite:

| Doc | Title | Description |
|-----|-------|-------------|
| [Doc 00](docs/craps-sim-doc00-master-design.md) | Master Design | Project overview, tech stack, complete bet catalog, game state machine |
| [Doc 01](docs/craps-sim-doc01-phase1-visual-foundation.md) | Phase 1 — Visual Foundation | Table SVG, dice, chips, puck, setup screen |
| [Doc 02](docs/craps-sim-doc02-phase2-dice-engine.md) | Phase 2 — Dice Engine | Dice generation, bet resolution, payout calculator, statistical validation |
| [Doc 03](docs/craps-sim-doc03-phase3-game-loop.md) | Phase 3 — Game Loop | Playable game, auto-roll, same bet, payout animations, shooter rotation |
| [Doc 04](docs/craps-sim-doc04-phase4-bot-systems.md) | Phase 4 — Bot Systems | 8 bot co-bettors with real betting strategies |
| [Doc 05](docs/craps-sim-doc05-phase5-stats-phase6-polish.md) | Phase 5+6 — Stats & Polish | Stats panel, advisor, animations, responsive design |
| [Doc 06](docs/craps-sim-doc06-security.md) | Security | Threat model, CSP, input sanitization, dependency supply chain |
| [Doc 07](docs/craps-sim-doc07-llm-build-prompt.md) | LLM Build Prompt | Context document for LLM-assisted development |
| [Doc 08](docs/craps-sim-doc08-competitive-landscape.md) | Competitive Landscape | Survey of existing simulators and differentiation |
| [Doc 09](docs/craps-sim-doc09-monorepo-website.md) | Monorepo / Website | Deployment architecture and build pipeline |
| [Doc 10](docs/craps-sim-doc10-revision-gap-analysis.md) | Revision / Gap Analysis | Design gaps, pre-build bugs, post-phase reviews |
| [Doc 11](docs/craps-sim-doc11-architecture-decisions.md) | Architecture Decisions | 10 ADRs with rationale and alternatives considered |
| [Doc 12](docs/craps-sim-doc12-use-cases.md) | Use Cases | 4 personas, 10 detailed use cases with acceptance criteria |

Supporting documents:

| Doc | Description |
|-----|-------------|
| [Rules Reference Sources](docs/craps-sim-rules-reference-sources.md) | Cross-validation of 5 rules sources with payout verification |
| [Audit Report](docs/craps-sim-audit-report.md) | Pre-build statistical audit (3 bugs found and fixed) |
| [Craps Education for Poker Players](docs/craps-education-for-poker-players.md) | Pedagogical guide for the target audience |
| [Addendum: SPA, Setup, Table, Security](docs/craps-sim-addendum-spa-setup-table-security.md) | Clarifications on SPA mode, setup page spec, table rendering |
| [MBS Craps Game Rules v3](docs/MBS-Craps-Game-Rules-Version-3.pdf) | Canonical rules reference (Singapore GRA approved, Feb 2020) |
| [Craps Table Layout SVG](docs/Craps_table_layout.svg) | Wikimedia reference SVG (geometry only — not used in production) |

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

[MIT](LICENSE)
