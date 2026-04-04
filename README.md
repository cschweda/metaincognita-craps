# Craps Simulator

A browser-based casino craps training tool built with Nuxt 4 and Nuxt UI. Learn which bets are mathematically sound, which are sucker bets, and why — by watching the math play out in real time across hundreds of rolls.

## Features

- **Interactive SVG craps table** with all standard betting zones
- **Complete bet catalog** — 44 named bet types covering every standard casino craps wager
- **Mathematically verified engine** — integer-cent arithmetic, chi-squared validated dice, house edge convergence tests
- **8 bot co-bettors** with real betting strategies (Pass + Max Odds, Martingale, Iron Cross, Three-Point Molly, and more)
- **Real-time stats panel** with per-bet EV analysis and bot comparison dashboard
- **Configurable table rules** — odds multiples (1x to 100x), field payouts, vig timing, payout rounding
- **Casino-dark aesthetic** — emerald felt, walnut rail, 3D dice, stacked chips

## Rules Reference

Game rules are cross-validated against the **Marina Bay Sands Craps Game Rules (Version 3)**, approved by the Gambling Regulatory Authority of Singapore, and the **Colorado Division of Gaming Rule 23**. The MBS PDF is included in `docs/`.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Nuxt 4 (`ssr: false` — client-side SPA) |
| UI | Nuxt UI v4 + Tailwind CSS v4 |
| State | Pinia (single store) |
| Language | TypeScript (strict) |
| Testing | Vitest |
| Deployment | Netlify (static) |

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
- Dice distribution chi-squared uniformity test (1M+ rolls)
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
│   └── table/       # Game table components
├── composables/     # Game engine (dice, bets, payouts, game loop)
├── stores/          # Single Pinia store (useCrapsStore)
└── utils/           # BetType enum, formatting, sanitization
craps.config.ts      # Master config (stakes, payouts, odds, bots)
docs/                # 13-document design suite + MBS rules PDF
```

## Design Documentation

The `docs/` directory contains a 13-document design suite covering every aspect of the simulator — from the master design and phase specs to architecture decisions, competitive analysis, use cases, and security.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT
