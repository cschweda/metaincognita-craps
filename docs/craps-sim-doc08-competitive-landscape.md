# Craps Simulator — Doc 08: Competitive Landscape & Differentiation

## Overview

This document surveys existing craps simulators across desktop, browser, and headless categories to establish what's already available, where each product excels, where each falls short, and how our simulator differentiates itself.

---

## Desktop Software

### WinCraps

- **URL:** cloudcitysoftware.com
- **Platform:** Windows only (since 1996, last updated 2024)
- **Price:** $14.95 (Classic), $5.95 upgrade to Pro
- **What it does well:**
  - The most powerful craps simulation engine in existence. Virtually every aspect of the game is configurable — payoffs, odds multiples up to 9,999×, even dice probability matrices (for modeling biased dice).
  - Auto-Betting engine lets you script complex betting strategies with conditional logic and run them hands-free.
  - Hyper-Drive mode runs millions of rolls in seconds for statistical analysis.
  - Roll file support: record real casino rolls and replay them through the simulator to backtest strategies against actual dice data.
  - Comprehensive statistics screens and graphs.
  - Full table layout (Pro version) that can be moved, sized, and rotated.
  - Loyal community of dice control enthusiasts who've used it for decades.
- **Where it falls short:**
  - Windows only. No Mac, no Linux, no web.
  - UI dates to the mid-1990s. Functional but not visually polished by modern standards.
  - Single-player only — no bot co-bettors running different strategies side by side.
  - No real-time EV/house edge display per bet. Statistics are post-session, not live.
  - No educational advisor explaining why a bet is good or bad.
  - Scripting language for auto-bet is powerful but has a steep learning curve.

### Smart Craps

- **URL:** deepnettech.com
- **Platform:** Windows only
- **Price:** $129.95
- **What it does well:**
  - Built specifically for the dice control / dice influence community.
  - Roll Recorder tool (including a Palm OS version, if that dates it for you) to log real-world throws and analyze patterns.
  - Calculates whether observed roll distributions deviate from random at statistical significance.
- **Where it falls short:**
  - Extremely niche — useless if you're not interested in dice control theory.
  - No visual table simulation for playing/practicing.
  - $130 for a tool most players will never need.
  - No updates in years. Windows only.

### My Craps Game

- **URL:** mycrapsgame.com
- **Platform:** Mac and Windows
- **Price:** $19 (download) / $29 (CD with both versions)
- **What it does well:**
  - One of the few Mac-native craps simulators.
  - Designed by a craps tournament finalist with attention to dealer mechanics.
  - Claims to play "with the right rules and correct Las Vegas odds."
  - Includes help tutorials and video guides.
  - Dice history and results log for reviewing what happened.
- **Where it falls short:**
  - Last significant update was version 1.4. Unclear if it runs on current macOS.
  - No strategy automation or backtesting.
  - No bot co-bettors or strategy comparison.
  - No statistical validation or house edge display.
  - Dated UI. Small user base.

---

## Browser-Based Simulators

### Infinite Craps

- **URL:** infinitecraps.com
- **What it does well:**
  - The most feature-complete browser-based craps simulator available.
  - Shared multiplayer table — a live, always-on simulation where spectator avatars are visible.
  - 75+ bet types including bonus bets (Fire Bet, All-Tall-Small) that most simulators skip.
  - 18 preset strategies (Pass + Odds, Iron Cross, 3-Point Molly, $44 Inside, Paroli, Fibonacci, 5-Count Method, and more).
  - Custom strategy builder with progression systems (Martingale, Paroli, Oscar's Grind), conditional rules based on streak length, bankroll thresholds, shooter roll count, and game phase.
  - Backtesting against 10,000+ rolls with instant P&L chart updates.
  - Autopilot mode — apply any strategy and watch it play automatically.
  - 8 interactive analytics charts (performance, roll distribution, dice frequency, etc.).
  - 3D dice physics.
  - Free, no download, no ads.
- **Where it falls short:**
  - Shared table model means you can't control the pace. You're watching a communal simulation, not running your own.
  - No bot co-bettors with named strategies running alongside you. You can't see "how would Martingale Mike have done on this same sequence of rolls?"
  - No per-bet EV/house edge education in context. The analytics are about *your* results, not about *why* each bet costs what it does.
  - No advisor panel explaining optimal play or warning about sucker bets in real time.
  - No configurable table rules (odds multiples, Field 12 payout, vig timing). One table, one rule set.
  - Strategy builder is powerful but requires understanding the system already — not a teaching tool.

### Craps Simulator (Vercel)

- **URL:** craps-simulator-site.vercel.app
- **What it does well:**
  - 14+ strategies with configurable odds multiples (3-4-5×, 10×, 100×).
  - Live table visualization.
  - Roll-by-roll tracking with detailed stats.
  - Clean, modern web UI.
- **Where it falls short:**
  - No visual table — statistics-focused, not experience-focused.
  - No co-bettors or strategy comparison on the same roll sequence.
  - No educational content or advisor.
  - Limited bet types compared to Infinite Craps.

### Dicer

- **URL:** dicer.io
- **What it does well:**
  - Strategy builder with a social/competitive twist — tournaments where players compete with their strategies.
  - Freemium model: free accounts create public strategies; paid accounts get privacy and play chips.
  - Manual play mode for practicing alongside automated strategies.
- **Where it falls short:**
  - Freemium friction — free users can't keep strategies private.
  - Tournament focus may not appeal to solo learners.
  - Limited analytics compared to Infinite Craps.
  - No educational advisor or house edge display.

### CrapsAge

- **URL:** crapsage.com
- **What it does well:**
  - Free downloadable browser game. Zero friction to start playing.
  - Been around since ~2010. Stable, if basic.
- **Where it falls short:**
  - Extremely basic — click to roll, see the result. No strategy automation, no statistics, no analytics.
  - Dated UI. No educational content.
  - No mobile optimization.

### Chipy Craps Simulator

- **URL:** chipy.com/tools/craps-simulator
- **What it does well:**
  - Built into a gambling information site with strategy guides alongside the simulator.
  - Beginner-friendly — the focus is on learning, not on advanced analytics.
- **Where it falls short:**
  - Affiliate site — the simulator exists to drive traffic to online casino signups.
  - Basic functionality. No strategy automation, limited bet types.
  - No real statistical depth.

### Crapsee

- **URL:** crapsee.com (v3)
- **What it does well:**
  - Clean interface for basic craps practice.
- **Where it falls short:**
  - Minimal feature set. No strategy tools, no analytics, no co-bettors.

---

## Headless / Code-Only Simulators

### crapssim (Python)

- **URL:** github.com/skent259/crapssim
- **What it does well:**
  - Clean Python package with a well-designed strategy API.
  - Run thousands of sessions programmatically and output comparison data.
  - Built-in example strategies (PassLinePlace68, IronCross, etc.).
  - Produces publication-quality charts comparing strategy performance.
  - Open source, well-documented.
- **Where it falls short:**
  - No visual table at all. Pure headless simulation.
  - Requires Python knowledge to use.
  - No interactivity — you can't "play" craps, only run batch simulations.
  - No educational component.

### dmuth/craps-simulator (PHP)

- **URL:** github.com/dmuth/craps-simulator
- **What it does well:**
  - Simple, honest weekend project. Event-driven architecture is a nice design exercise.
- **Where it falls short:**
  - Pass Line + odds only. No other bet types.
  - Command-line PHP. No UI at all.
  - Not maintained.

---

## The Gap in the Market

The landscape breaks into three clusters with nothing in between:

**Cluster 1 — Powerful but ugly/old/Windows-only:** WinCraps has the most powerful engine but looks like Windows 3.1 and runs nowhere else. Smart Craps is $130 and niche. My Craps Game may not run on modern macOS.

**Cluster 2 — Browser-based but either shallow or analytics-only:** Infinite Craps is impressive on analytics and strategy backtesting but it's a shared-table spectator model, not a personal learning tool. The Vercel simulator is statistics-focused with no visual table experience. Everyone else (CrapsAge, Chipy, Crapsee) is basic click-to-roll with no depth.

**Cluster 3 — Headless code:** crapssim is great for researchers but has no UI and requires Python.

**What nobody has built:**

A polished, browser-based, single-player craps simulator that combines:

1. A visually accurate casino table rendered from a verified SVG reference
2. Interactive bet placement with real-time per-bet EV and house edge display
3. Bot co-bettors running named strategies (Conservative Carl, Martingale Mike, Iron Cross Irene, etc.) alongside the hero on the same roll sequence — so you can *watch* strategies succeed and fail in parallel
4. An advisor panel that explains *why* each bet is good or bad, in context, at the moment you're about to make it
5. Statistical validation proving the engine is mathematically correct (chi-squared dice fairness, house edge convergence for every bet type)
6. Modern web stack (Nuxt 4, Nuxt UI, Pinia) running as a static SPA on Netlify — no download, no install, cross-platform
7. The visual polish and production quality of a serious application, not a weekend project

That's what this simulator is.

---

## Feature Comparison Matrix

| Feature | WinCraps | Infinite Craps | crapssim | Vercel Sim | **Ours** |
|---------|----------|---------------|----------|------------|----------|
| Platform | Windows | Browser | Python CLI | Browser | **Browser (SPA)** |
| Price | $14.95 | Free | Free | Free | **Free** |
| Visual table | Yes (2D) | Yes (3D dice) | No | Partial | **Yes (SVG, reference-verified)** |
| Bet types | All standard | 75+ w/ bonus | ~10 | ~14 | **44 named bet types + configurable** |
| Bot co-bettors | No | No | Via code | No | **Yes — 8 named strategies** |
| Strategy automation | Script language | Builder + autopilot | Python API | Presets | **Bot personas + auto-roll** |
| Per-bet EV display | No | No | No | No | **Yes — real-time** |
| Educational advisor | Manual (help file) | No | No | No | **Yes — contextual warnings** |
| Strategy backtesting | Via auto-bet + stats | Yes (10K+ rolls) | Yes (batch) | Limited | **Via extended sessions** |
| Statistical validation | No | No | No | No | **Yes — chi-squared + convergence** |
| House edge proof | No | No | No | No | **Yes — per bet type** |
| Configurable rules | Extensive | No | Limited | Odds only | **Yes — odds, field, vig, rounding** |
| Dice probability override | Yes | No | No | No | **No (fair dice only)** |
| Roll file import | Yes | No | No | No | **No (future enhancement)** |
| Mobile responsive | No | Yes | N/A | Yes | **Yes** |
| Open source | No | No | Yes | Unknown | **Private repo** |

---

## What We Can Learn From Each Competitor

**From WinCraps:** The auto-bet scripting engine and roll file import are powerful features for advanced users. We won't replicate the scripting language, but our bot persona system achieves the same goal more accessibly — instead of writing a script, you watch a named bot execute a named strategy. Roll file import is a good future enhancement.

**From Infinite Craps:** The strategy builder with progression systems and conditional rules is well-designed. Our bot system covers the most important strategies, but a "build your own bot" feature in a future version would close this gap. Their 75+ bet types including Fire Bet and All-Tall-Small are ambitious — we start with 44 named bet types (see BetType enum in Doc 07) and can add bonus bets later via configurable table rules.

**From crapssim:** The clean Python strategy API is elegant. Our Pinia store's bet resolution engine needs to be just as clean and testable. Their batch simulation output with comparison charts is exactly what our Phase 5 stats comparison dashboard delivers, but with a visual UI instead of a Python script.

**From Vercel Simulator:** The clean, modern UI and configurable odds multiples are table stakes. Our setup page already specifies this.

---

## Our Differentiators (Summary for README)

1. **Bot co-bettors.** Eight AI players with distinct, named strategies play alongside you on every roll. Watch Conservative Carl's Pass + Max Odds bankroll diverge from Martingale Mike's exponential swings in real time. No other simulator does this.

2. **Real-time education.** Every bet on the table shows its house edge. The advisor warns you before you make a sucker bet and explains why. The probability dashboard updates every roll. You learn by playing, not by reading a manual.

3. **Mathematically verified.** The engine includes a statistical validation suite — chi-squared tests for dice fairness, house edge convergence tests for every bet type, payout precision checks. The simulator proves itself correct.

4. **Verified table geometry.** The table SVG is built from a reference casino layout (Wikimedia CC BY-SA 3.0) with coordinates extracted directly from the source file. Every zone is in the right place because it was traced from a real table, not drawn freehand by an AI.

5. **Canonical rules.** Game rules are cross-validated against four independent sources including two government-approved regulatory documents (Singapore GRA and Colorado Division of Gaming) and US state law. Every payout is verified from first principles.

6. **Modern web stack.** Nuxt 4, Nuxt UI v4, Pinia, deployed as a static SPA on Netlify. No download, no install, runs on any device with a browser. Responsive from desktop to mobile.

7. **Production quality.** This isn't a weekend project or a homework assignment. It's built to the same standard as the NLH Hold'em Simulator — 13-document design suite, security review, accessibility considerations, and a codebase designed for long-term maintenance.
