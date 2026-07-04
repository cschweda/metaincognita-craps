# Engine Extraction & Full Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the craps engine into pure, importable modules so the existing tests exercise the shipped code; fix six verified engine bugs; harden performance, accessibility, and deploy config.

**Architecture:** A new `app/engine/` directory holds pure TypeScript functions (no Pinia, no Vue, no Nuxt auto-imports, relative imports only). Composables (`useGameLoop`, `useBetManager`) become thin store-wiring layers that import the engine. Tests import the engine directly and delete their inline re-implementations. Everything else (perf, a11y, config) layers on top.

**Tech Stack:** Nuxt 4 SPA (`ssr: false`), Pinia, Nuxt UI v4, Tailwind 4, Vitest 4, pnpm, Netlify static.

## Global Constraints

- **Commit messages: NEVER add `Co-Authored-By` or any AI-attribution trailer.** Plain conventional-commit messages only. (User's global rule — overrides all defaults.)
- All money amounts are **integer cents**. Payout = wager + winnings (what the player receives back).
- `app/engine/*` files: **relative imports only** (`../utils/betTypes`, `../../craps.config`), no Nuxt auto-imports, no Vue reactivity, no side effects. This keeps them importable from plain Vitest node tests.
- App code (components/composables/stores) may import the engine as `~/engine/<file>` — `app/engine/` is NOT auto-imported by Nuxt, so every use needs an explicit import.
- Match file-local code style (ESLint stylistic: `commaDangle: never`, `1tbs` in app code; existing test files use trailing commas — match whichever file you're editing).
- After every task: `pnpm lint && pnpm typecheck && pnpm test` must pass (once Task 1 changes `test` to `vitest run`).
- Run all commands from the repo root `/Volumes/satechi/webdev/metaincognita-craps`.
- Baseline branch for this work: `fix/engine-and-hardening` (created in Task 1). Commit after each task.

---

### Task 1: Branch, repo hygiene, dependency placement

**Files:**
- Modify: `.gitignore`, `package.json`
- Delete (untrack): `.playwright-mcp/page-2026-04-04T17-41-00-504Z.yml`
- Delete: `playwright.config.ts`

**Interfaces:**
- Produces: branch `fix/engine-and-hardening`; `pnpm test` runs vitest once (no watch); e2e scaffolding removed.

- [ ] **Step 1: Create branch and verify baseline**

```bash
git checkout -b fix/engine-and-hardening
pnpm vitest run
```
Expected: all 5 test files pass (this is the pre-existing suite; it tests inline copies — that's what later tasks fix).

- [ ] **Step 2: Untrack the committed MCP artifact and ignore the directory**

```bash
git rm --cached .playwright-mcp/page-2026-04-04T17-41-00-504Z.yml
```

Append to `.gitignore` (after the `# Playwright` block):

```
# Playwright MCP browser dumps
.playwright-mcp/
```

- [ ] **Step 3: Remove dead e2e scaffolding**

Playwright has a config but zero test files (`playwright.config.ts` points at `./tests`, which is empty). Remove it deliberately; re-add when real e2e tests are written.

```bash
git rm playwright.config.ts
pnpm remove @playwright/test playwright-core
```

In `package.json` scripts, delete the two lines:

```json
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
```

- [ ] **Step 4: Fix dependency placement and test script**

In `package.json`:
1. Move `"@nuxt/test-utils": "4.0.0"` from `dependencies` to `devDependencies` (keep the exact pin — `.nuxtrc` enforces it).
2. Change `"test": "vitest"` to `"test": "vitest run"` (`test:watch` already exists for watch mode).

```bash
pnpm install
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "chore: untrack MCP artifacts, remove dead e2e scaffolding, fix dep placement"
```

---

### Task 2: Extract `app/engine/payouts.ts`, retarget `payout.test.ts`

**Files:**
- Create: `app/engine/payouts.ts`
- Modify: `app/composables/usePayoutCalc.ts` (delete — see step 3), `app/composables/useGameLoop.ts:48-59`, `app/composables/useBetManager.ts:32`
- Test: `test/unit/payout.test.ts`

**Interfaces:**
- Produces (all exported from `app/engine/payouts.ts`):
  - `applyRatio(amountCents: number, ratio: [number, number]): number`
  - `calculateVig(amountCents: number): number`
  - `applyPayoutRounding(cents: number, rounding: TableRules['payoutRounding']): number`
  - `calculatePayout(bet: ActiveBet, tableRules: TableRules): number`
  - `calculateFieldPayout(amount: number, total: number, tableRules: TableRules): number`
  - `calculateCEPayout(amount: number, total: number): number`
  - `calculateHornPayout(totalBet: number, total: number): number`
  - `calculateHornHighPayout(totalBet: number, total: number): number` *(highNumber param added in Task 8, not here)*
  - `getMaxOdds(flatBetAmount: number, pointNumber: number, oddsMultipleKey: string): number`

- [ ] **Step 1: Create `app/engine/payouts.ts`**

Move the function bodies **verbatim** from `app/composables/usePayoutCalc.ts:11-260` out of the `usePayoutCalc()` closure into module-level `export function` declarations. Header:

```ts
import type { ActiveBet, TableRules } from '../utils/betTypes'
import { betTypeToNumber, isBuyBet, isLayBet, isPlaceBet, isHardwayBet } from '../utils/betTypes'
import { crapsConfig } from '../../craps.config'

const { payouts, oddsMultiples } = crapsConfig
```

Every function keeps its exact body EXCEPT delete three dead branches inside `calculatePayout` (they are unreachable — `resolveSingleBet` routes these types to the dedicated calculators before ever calling `calculatePayout`):
- the `--- Field ---` branch (`usePayoutCalc.ts:127-133`)
- the `--- C&E ---` branch (`usePayoutCalc.ts:171-175`)
- the `--- Horn ---` branch (`usePayoutCalc.ts:177-181`)

The function still ends with `return amount` as the fallback.

- [ ] **Step 2: Retarget `test/unit/payout.test.ts`**

Replace lines 1-55 (the header comment + inline `applyRatio`/`calculateVig`/`applyPayoutRounding`/`calculateFieldPayout`/`calculateBuyPayout` definitions) with:

```ts
import { describe, it, expect } from 'vitest'
import type { ActiveBet, TableRules } from '../../app/utils/betTypes'
import {
  applyRatio,
  calculateVig,
  applyPayoutRounding,
  calculatePayout,
  calculateFieldPayout,
} from '../../app/engine/payouts'
```

In the two Buy-bet tests (lines 181, 202), rename `calculateBuyPayout(bet, rules)` → `calculatePayout(bet, rules)` (the real engine handles buy bets inside `calculatePayout`; the expected values 5800 and 6000 are unchanged).

- [ ] **Step 3: Run the retargeted test**

```bash
pnpm vitest run test/unit/payout.test.ts
```
Expected: PASS — the engine code is a verbatim move, so all existing expectations hold.

- [ ] **Step 4: Point the composables at the engine and delete `usePayoutCalc`**

```bash
grep -rn "usePayoutCalc" app/
```
Expected consumers: `app/composables/useGameLoop.ts:51-59` and `app/composables/useBetManager.ts:32`. If `useAdvisor.ts` or any component also matches, give it the same treatment (replace destructured composable call with direct engine imports).

In `useGameLoop.ts`, delete lines 51-59 (`const { applyRatio, ... } = usePayoutCalc()`) and add to the imports at the top:

```ts
import {
  applyRatio,
  calculatePayout,
  calculateFieldPayout,
  calculateCEPayout,
  calculateHornPayout,
  calculateHornHighPayout,
  calculateVig
} from '~/engine/payouts'
```

In `useBetManager.ts`, replace line 32 `const { calculateVig, getMaxOdds } = usePayoutCalc()` with a top-of-file import:

```ts
import { calculateVig, getMaxOdds } from '~/engine/payouts'
```

Delete `app/composables/usePayoutCalc.ts` entirely.

- [ ] **Step 5: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "refactor: extract pure payout engine, retarget payout tests at real code"
```

---

### Task 3: Extract `app/engine/resolution.ts`, retarget resolver/seven-out/come-lifecycle tests

**Files:**
- Create: `app/engine/resolution.ts`
- Modify: `app/composables/useGameLoop.ts`
- Test: `test/unit/resolver.test.ts`, `test/unit/seven-out.test.ts`, `test/unit/come-lifecycle.test.ts`

**Interfaces:**
- Produces (exported from `app/engine/resolution.ts`):
  - `getResolutionOrder(type: BetType): number`
  - `isBetWorking(bet: ActiveBet, phase: GamePhase): boolean` *(signature narrowed in Task 7 — keep the phase param for now)*
  - `makeResolution(bet: ActiveBet, outcome: BetResolution['outcome'], payout: number, description: string): BetResolution`
  - `resolveSingleBet(bet: ActiveBet, roll: DiceRoll, phase: GamePhase, tableRules: TableRules, point: number | null): BetResolution | null`
  - `resolveRoll(roll: DiceRoll, activeBets: ActiveBet[], phase: GamePhase, tableRules: TableRules, point: number | null): BetResolution[]`
  - `transition(phase: GamePhase, roll: DiceRoll, point: number | null): { newPhase: GamePhase; newPoint: number | null }`
  - `getStickmanCall(roll: DiceRoll, phase: GamePhase, point: number | null): StickmanCall`
  - `export interface StickmanCall { message: string; type: '' | 'natural' | 'craps' | 'point' | 'winner' | 'sevenout' | 'neutral' }`
  - `export const FIELD_NUMBERS: Set<number>`

- [ ] **Step 1: Create `app/engine/resolution.ts`**

Header:

```ts
import type { DiceRoll, ActiveBet, BetResolution, GamePhase, TableRules, BetType } from '../utils/betTypes'
import {
  betTypeToNumber,
  isPlaceBet,
  isBuyBet,
  isLayBet,
  isHardwayBet,
  POINT_NUMBERS
} from '../utils/betTypes'
import { crapsConfig } from '../../craps.config'
import {
  applyRatio,
  calculatePayout,
  calculateFieldPayout,
  calculateCEPayout,
  calculateHornPayout,
  calculateHornHighPayout
} from './payouts'

export const FIELD_NUMBERS = new Set([2, 3, 4, 9, 10, 11, 12])

export interface StickmanCall {
  message: string
  type: '' | 'natural' | 'craps' | 'point' | 'winner' | 'sevenout' | 'neutral'
}
```

Then move **verbatim**, adding `export` to each:
- `getResolutionOrder` from `useGameLoop.ts:19-46`
- `isBetWorking` from `useGameLoop.ts:64-83`
- `resolveRoll` from `useGameLoop.ts:88-111`
- `resolveSingleBet` from `useGameLoop.ts:113-476`
- `makeResolution` from `useGameLoop.ts:478-502`
- `transition` from `useGameLoop.ts:507-541`
- `getStickmanCall` from `useGameLoop.ts:566-618` — its return type annotation becomes `StickmanCall`

No logic changes in this task.

- [ ] **Step 2: Slim `app/composables/useGameLoop.ts` to the store wiring**

The composable keeps ONLY: `executeRoll` (lines 623-779), `applyPointEstablished` (547-561), and the `return` block. Its imports become:

```ts
import type { DiceRoll, ActiveBet, BetResolution, GamePhase } from '~/utils/betTypes'
import { isPlaceBet, isBuyBet, isHardwayBet } from '~/utils/betTypes'
import { calculateVig } from '~/engine/payouts'
import {
  resolveRoll,
  isBetWorking,
  makeResolution,
  transition,
  getStickmanCall
} from '~/engine/resolution'
```

(`resolveSingleBet` is not imported — `executeRoll` only calls `resolveRoll`. Trim any type imports the compiler flags as unused.)

The composable's returned object changes to `return { executeRoll }` — `resolveRoll`, `transition`, `getStickmanCall`, `isBetWorking` are no longer composable members (grep for consumers first: `grep -rn "useGameLoop()" app/` — `table.vue:9` destructures only `executeRoll`, so nothing else breaks; if anything else destructures the pure fns, convert it to a direct engine import).

Delete the now-unused `useDice`/`rollDice` wiring **only if** it errors — Task 4 handles dice; leave `const { roll: rollDice } = useDice()` in place for now.

- [ ] **Step 3: Retarget `test/unit/resolver.test.ts`**

Delete lines 1-348 (imports + ALL inline helpers: `betTypeToNumber`…`isBetWorking`…`calculatePayout`…`resolveSingleBet`…`getResolutionOrder`…`resolveRoll`). Replace with:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { ActiveBet, BetResolution, DiceRoll, TableRules } from '../../app/utils/betTypes'
import { resolveRoll } from '../../app/engine/resolution'
```

Keep everything from `// ---- Test helpers ----` (line 350) onward untouched — the test-case calls `resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)` match the engine signature exactly.

- [ ] **Step 4: Retarget `test/unit/seven-out.test.ts`**

Same surgery: delete the inline implementation block (everything between the imports and `// ---- Helpers ----` at line 203). New header:

```ts
import { describe, it, expect } from 'vitest'
import type { ActiveBet, BetResolution, DiceRoll, TableRules } from '../../app/utils/betTypes'
import { resolveRoll } from '../../app/engine/resolution'
```

Drop the unused `beforeEach`/`GamePhase`/`crapsConfig` imports. Test cases from line 205 down stay verbatim.

- [ ] **Step 5: Retarget `test/unit/come-lifecycle.test.ts`**

Delete lines 1-76 (inline `applyRatio`/`applyPayoutRounding`/`calculatePayout`/`isBetWorking`/`makeResolution`/`resolveCome`). Replace with:

```ts
import { describe, it, expect } from 'vitest'
import type { ActiveBet, DiceRoll, TableRules } from '../../app/utils/betTypes'
import { resolveSingleBet } from '../../app/engine/resolution'

/**
 * The engine has no standalone resolveCome — come bets resolve through
 * resolveSingleBet. Phase/point are irrelevant to come resolution, so pin
 * POINT_PHASE / point 8 for all lifecycle cases.
 */
function resolveCome(bet: ActiveBet, roll: DiceRoll, tableRules: TableRules) {
  return resolveSingleBet(bet, roll, 'POINT_PHASE', tableRules, 8)
}
```

Every existing test call site keeps working. Keep the helpers (`defaultTableRules`, `makeComeBet`, `makeRoll`) and all tests verbatim.

- [ ] **Step 6: Run all retargeted tests, verify, commit**

```bash
pnpm vitest run
pnpm lint && pnpm typecheck
git add -A
git commit -m "refactor: extract pure resolution engine, retarget resolver/seven-out/come tests"
```
Expected: PASS — verbatim moves. If a resolver expectation fails, the engine and the old inline copy genuinely diverge: STOP and compare the failing case against the real engine (the engine is the source of truth; fix the test's stale expectation, and note the divergence in the commit message).

---

### Task 4: Extract `app/engine/rng.ts`; single dice path; seeded, deterministic dice test

**Files:**
- Create: `app/engine/rng.ts`
- Modify: `app/pages/table.vue:184-185`, `app/composables/useGameLoop.ts` (dice fallback)
- Delete: `app/composables/useDice.ts`
- Test: `test/unit/dice.test.ts`

**Interfaces:**
- Produces (from `app/engine/rng.ts`):
  - `createSeededRng(seed: number): () => number` — mulberry32, returns floats in [0,1)
  - `rollDice(rng?: () => number): DiceRoll` — defaults to `Math.random`

- [ ] **Step 1: Write the failing test**

Rewrite `test/unit/dice.test.ts` (keep its chi-squared math, make it deterministic):

```ts
import { describe, it, expect } from 'vitest'
import { createSeededRng, rollDice } from '../../app/engine/rng'

describe('rollDice', () => {
  it('maps rng output to dice faces uniformly (exhaustive 36 combos)', () => {
    // Stub rng cycling through 36 evenly spaced values → every (d1,d2) combo exactly once
    const values: number[] = []
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) values.push(a / 6 + 0.001, b / 6 + 0.001)
    let i = 0
    const rng = () => values[i++]!
    const seen = new Set<string>()
    for (let n = 0; n < 36; n++) {
      const r = rollDice(rng)
      expect(r.total).toBe(r.die1 + r.die2)
      expect(r.isHard).toBe(r.die1 === r.die2)
      expect(r.die1).toBeGreaterThanOrEqual(1)
      expect(r.die2).toBeLessThanOrEqual(6)
      seen.add(`${r.die1}-${r.die2}`)
    }
    expect(seen.size).toBe(36)
  })

  it('seeded chi-squared uniformity over 100k rolls (deterministic)', () => {
    const rng = createSeededRng(0xC0FFEE)
    const counts = new Array(13).fill(0)
    const N = 100_000
    for (let n = 0; n < N; n++) counts[rollDice(rng).total]++
    // Expected probabilities for totals 2..12 out of 36
    const ways = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]
    let chi2 = 0
    for (let t = 2; t <= 12; t++) {
      const expected = N * ways[t]! / 36
      chi2 += (counts[t]! - expected) ** 2 / expected
    }
    // 10 degrees of freedom, p=0.01 critical value = 23.21.
    // Seeded → this specific value never changes run to run.
    expect(chi2).toBeLessThan(23.21)
  })

  it('same seed reproduces the same sequence', () => {
    const a = createSeededRng(42)
    const b = createSeededRng(42)
    for (let n = 0; n < 100; n++) expect(rollDice(a)).toEqual(rollDice(b))
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm vitest run test/unit/dice.test.ts
```
Expected: FAIL — `app/engine/rng` does not exist.

- [ ] **Step 3: Create `app/engine/rng.ts`**

```ts
import type { DiceRoll } from '../utils/betTypes'

/** Mulberry32 — small, fast, seedable PRNG for reproducible sessions/tests. */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6D2B79F5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function rollDice(rng: () => number = Math.random): DiceRoll {
  const die1 = Math.floor(rng() * 6) + 1
  const die2 = Math.floor(rng() * 6) + 1
  return { die1, die2, total: die1 + die2, isHard: die1 === die2 }
}
```

- [ ] **Step 4: Single dice path in the app**

1. `app/pages/table.vue`: add `import { rollDice } from '~/engine/rng'` and replace lines 184-185:
   ```ts
   const { die1: d1, die2: d2 } = rollDice()
   ```
2. `app/composables/useGameLoop.ts`: delete `const { roll: rollDice } = useDice()` and add `rollDice` to the `~/engine/rng` import; the `roll = rollDice()` fallback in `executeRoll` keeps working.
3. `grep -rn "useDice" app/` — expected: no remaining consumers. Delete `app/composables/useDice.ts`.
4. `DicePair.vue`'s `Math.random` face-cycling stays — it's cosmetic animation, not a game roll.

- [ ] **Step 5: Run, verify, commit**

```bash
pnpm vitest run && pnpm lint && pnpm typecheck
git add -A
git commit -m "feat: seedable RNG engine module, single dice path, deterministic dice tests"
```

---

### Task 5: Coverage enforcement, store unit test, CI that actually gates

**Files:**
- Modify: `vitest.config.ts`, `.github/workflows/ci.yml`, `package.json` (coverage script unchanged, verify)
- Create: `test/unit/store.test.ts`

**Interfaces:**
- Consumes: engine modules from Tasks 2-4; `useCrapsStore` (importable in node env once aliases exist).
- Produces: vitest `~`/`~~` aliases for the unit project; CI running lint → typecheck → coverage-enforced tests → build.

- [ ] **Step 1: vitest aliases + coverage thresholds**

Replace `vitest.config.ts` content:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

const alias = {
  '~~': fileURLToPath(new URL('.', import.meta.url)),
  '~': fileURLToPath(new URL('./app', import.meta.url)),
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['test/unit/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL('.', import.meta.url)),
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
    ],
    coverage: {
      provider: 'v8',
      include: ['app/engine/**', 'app/utils/**', 'app/stores/**', 'craps.config.ts'],
      thresholds: {
        'app/engine/**/*.ts': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
})
```

Note `coverage.enabled: true` is intentionally dropped — plain `pnpm test` runs fast; `pnpm test:coverage` (already `vitest --coverage`) enforces thresholds. Change that script to `vitest run --coverage` in `package.json`.

- [ ] **Step 2: Store unit test (importable now that aliases exist)**

`app/stores/craps.ts` uses only explicit imports (no auto-imports), so it works in the node project. Create `test/unit/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCrapsStore } from '../../app/stores/craps'
import { generateBetId } from '../../app/utils/betTypes'
import type { ActiveBet } from '../../app/utils/betTypes'

// Minimal localStorage stub for the node environment
const storage = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: (i: number) => [...storage.keys()][i] ?? null,
  get length() { return storage.size },
} as Storage

function initStore() {
  const store = useCrapsStore()
  store.initializeGame({
    heroName: 'Tester',
    bankroll: 50000,
    stakeLevel: 2,
    tableRules: {},
    bots: [],
  })
  return store
}

function makeBet(overrides: Partial<ActiveBet> = {}): ActiveBet {
  return {
    id: generateBetId(),
    type: 'pass',
    owner: 'hero',
    amount: 1000,
    oddsAmount: 0,
    pointNumber: null,
    isContract: false,
    isWorking: true,
    status: 'active',
    placedOnRoll: 1,
    resolvedOnRoll: null,
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  storage.clear()
})

describe('craps store', () => {
  it('addBet deducts bankroll and tracks wagered stats', () => {
    const store = initStore()
    store.addBet(makeBet({ amount: 1500 }))
    expect(store.hero!.bankroll).toBe(48500)
    expect(store.sessionStats.totalWagered).toBe(1500)
  })

  it('applyResolutions pays winners and removes resolved bets', () => {
    const store = initStore()
    const bet = makeBet({ amount: 1000 })
    store.addBet(bet)
    store.applyResolutions([{
      betId: bet.id, betType: 'pass', owner: 'hero',
      outcome: 'win', payout: 2000, netGain: 1000, description: 'test',
    }])
    expect(store.hero!.bankroll).toBe(51000)
    expect(store.activeBets).toHaveLength(0)
  })

  it('save + load round-trips core state', () => {
    const store = initStore()
    store.addBet(makeBet())
    store.setPoint(6)
    store.saveToLocalStorage()

    setActivePinia(createPinia())
    const fresh = useCrapsStore()
    expect(fresh.loadFromLocalStorage()).toBe(true)
    expect(fresh.point).toBe(6)
    expect(fresh.activeBets).toHaveLength(1)
  })
})
```

Run: `pnpm vitest run test/unit/store.test.ts` — Expected: PASS.

- [ ] **Step 3: CI workflow**

Replace `.github/workflows/ci.yml`:

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Install pnpm
        uses: pnpm/action-setup@v5

      - name: Install node
        uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: pnpm run lint

      - name: Typecheck
        run: pnpm run typecheck

      - name: Test (coverage-enforced)
        run: pnpm run test:coverage

      - name: Build
        run: pnpm run generate
```

- [ ] **Step 4: Verify locally and commit**

```bash
pnpm run test:coverage
```
Expected: PASS with engine coverage ≥ thresholds (the retargeted suite covers payouts/resolution/rng heavily). If a threshold misses, note WHICH lines are uncovered — later bug-fix tasks add tests; only lower a threshold as a last resort and say so in the commit message.

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm generate
git add -A
git commit -m "ci: run tests, enforce engine coverage, build on CI; add store unit tests"
```

---

### Task 6: Fix H1 — Pass Line contract bets removable after point (new `app/engine/betting.ts`)

**Files:**
- Create: `app/engine/betting.ts`
- Modify: `app/composables/useBetManager.ts:297-323`
- Test: `test/unit/betting.test.ts` (create)

**Interfaces:**
- Produces (from `app/engine/betting.ts`):
  - `canRemoveBet(bet: ActiveBet, tablePoint: number | null): { allowed: boolean; reason: string }`
  - `getDefaultWorking(type: BetType, phase: GamePhase, tableRules: TableRules): boolean` *(added in Task 7 — file created here)*

- [ ] **Step 1: Write the failing test** — `test/unit/betting.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { ActiveBet } from '../../app/utils/betTypes'
import { canRemoveBet } from '../../app/engine/betting'

function makeBet(overrides: Partial<ActiveBet> & Pick<ActiveBet, 'type'>): ActiveBet {
  return {
    id: 'b1', owner: 'hero', amount: 1000, oddsAmount: 0,
    pointNumber: null, isContract: false, isWorking: true,
    status: 'active', placedOnRoll: 1, resolvedOnRoll: null,
    ...overrides,
  }
}

describe('canRemoveBet', () => {
  it('BLOCKS removing a Pass bet once the table point is established (H1 regression)', () => {
    // Pass bets never get pointNumber set — the table point is the contract trigger
    const bet = makeBet({ type: 'pass', isContract: true, pointNumber: null })
    expect(canRemoveBet(bet, 6).allowed).toBe(false)
  })

  it('allows removing a Pass bet on come-out (no point yet)', () => {
    const bet = makeBet({ type: 'pass', isContract: true })
    expect(canRemoveBet(bet, null).allowed).toBe(true)
  })

  it('blocks removing an established Come bet', () => {
    const bet = makeBet({ type: 'come', isContract: true, pointNumber: 8 })
    expect(canRemoveBet(bet, 6).allowed).toBe(false)
  })

  it('allows removing a pending Come bet (no come point yet)', () => {
    const bet = makeBet({ type: 'come', pointNumber: null })
    expect(canRemoveBet(bet, 6).allowed).toBe(true)
  })

  it('allows removing non-contract bets anytime', () => {
    expect(canRemoveBet(makeBet({ type: 'place6', pointNumber: 6 }), 6).allowed).toBe(true)
    expect(canRemoveBet(makeBet({ type: 'field' }), 6).allowed).toBe(true)
    expect(canRemoveBet(makeBet({ type: 'dontPass' }), 6).allowed).toBe(true)
  })
})
```

Run: `pnpm vitest run test/unit/betting.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 2: Create `app/engine/betting.ts`**

```ts
import type { ActiveBet } from '../utils/betTypes'

/**
 * Contract-bet removal rules (MBS 3.7 / 3.10): Pass Line may not be taken
 * down once the TABLE point is on; a Come bet may not be taken down once its
 * own point is established. Pass bets never carry pointNumber, so the table
 * point — not bet.pointNumber — is the trigger.
 */
export function canRemoveBet(bet: ActiveBet, tablePoint: number | null): { allowed: boolean; reason: string } {
  if (bet.type === 'pass' && tablePoint !== null) {
    return { allowed: false, reason: 'Pass Line is a contract bet — it cannot be removed after the point is established' }
  }
  if (bet.type === 'come' && bet.pointNumber !== null) {
    return { allowed: false, reason: 'Come bets are contract bets — they cannot be removed once their point is established' }
  }
  return { allowed: true, reason: '' }
}
```

Run the test again — Expected: PASS.

- [ ] **Step 3: Wire into `useBetManager.removeBet`**

Add `import { canRemoveBet } from '~/engine/betting'` to `useBetManager.ts`. Replace the broken guard block (`useBetManager.ts:301-313`, the `if (bet.isContract && bet.pointNumber !== null) { ... }` block) with:

```ts
    const removal = canRemoveBet(bet, store.point)
    if (!removal.allowed) {
      console.warn(removal.reason)
      return false
    }
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm vitest run && pnpm lint && pnpm typecheck
git add -A
git commit -m "fix: pass line contract bets can no longer be taken down after the point (MBS 3.7)"
```

---

### Task 7: Fix M1/M6 — working toggle inert in point phase; seven-out returns OFF bets; honor `hardwaysOnComeOut`

**Files:**
- Modify: `app/engine/resolution.ts` (`isBetWorking`), `app/engine/betting.ts` (add `getDefaultWorking`), `app/composables/useBetManager.ts:252-264`, `app/composables/useGameLoop.ts` (`executeRoll` steps 8 & 11)
- Test: `test/unit/resolver.test.ts` (append), `test/unit/betting.test.ts` (append)

- [ ] **Step 1: Failing engine tests** — append to `test/unit/resolver.test.ts`:

```ts
describe('resolveRoll – working status (OFF bets take no action)', () => {
  it('OFF place bet does not resolve on its number during point phase', () => {
    const bet = makeBet({ type: 'place6', pointNumber: 6, isWorking: false })
    const res = resolveRoll(makeRoll(4, 2), [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(res).toHaveLength(0)
  })

  it('OFF place bet does not lose on seven-out', () => {
    const bet = makeBet({ type: 'place8', pointNumber: 8, isWorking: false })
    const res = resolveRoll(makeRoll(4, 3), [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(res).toHaveLength(0)
  })

  it('OFF hardway does not resolve during point phase', () => {
    const bet = makeBet({ type: 'hard8', isWorking: false })
    const res = resolveRoll(makeRoll(4, 4), [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(res).toHaveLength(0)
  })

  it('ON place bet still wins during point phase', () => {
    const bet = makeBet({ type: 'place6', pointNumber: 6, isWorking: true })
    const res = resolveRoll(makeRoll(4, 2), [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(res).toHaveLength(1)
    expect(res[0]!.outcome).toBe('win')
  })

  it("don't-side odds are always working regardless of the flag", () => {
    const bet = makeBet({ type: 'dontPassOdds', pointNumber: 6, isWorking: false })
    const res = resolveRoll(makeRoll(4, 3), [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(res).toHaveLength(1)
    expect(res[0]!.outcome).toBe('win')
  })
})
```

Run: `pnpm vitest run test/unit/resolver.test.ts` — Expected: the first three FAIL (current `isBetWorking` returns `true` unconditionally in POINT_PHASE).

- [ ] **Step 2: Fix `isBetWorking` in `app/engine/resolution.ts`**

Replace the function body (keep the two-arg signature; `phase` becomes unused — prefix it `_phase` to satisfy lint):

```ts
export function isBetWorking(bet: ActiveBet, _phase: GamePhase): boolean {
  // Lay bets and don't-side odds are ALWAYS working
  if (isLayBet(bet.type)) return true
  if (bet.type === 'dontComeOdds' || bet.type === 'dontPassOdds') return true
  // These honor their working flag in every phase. Defaults are set at
  // placement and on phase transitions (getDefaultWorking); the flag is
  // the single source of truth here.
  if (isPlaceBet(bet.type) || isBuyBet(bet.type) || isHardwayBet(bet.type)) return bet.isWorking
  if (bet.type === 'passOdds' || bet.type === 'comeOdds') return bet.isWorking
  return true
}
```

Run tests — Expected: new tests PASS. **Existing seven-out cascade tests still pass** (their bets are `isWorking: true`).

- [ ] **Step 3: Add `getDefaultWorking` (failing test first)** — append to `test/unit/betting.test.ts`:

```ts
import { getDefaultWorking } from '../../app/engine/betting'
import type { TableRules } from '../../app/utils/betTypes'

const rules: TableRules = {
  minBet: 500, maxBet: 50000, oddsMultiple: '3-4-5x',
  fieldTwelvePayout: 3, buyVigTiming: 'on_win',
  hardwaysOnComeOut: false, payoutRounding: 'exact',
}

describe('getDefaultWorking', () => {
  it('place/buy/pass-odds/come-odds are OFF on come-out', () => {
    expect(getDefaultWorking('place6', 'COME_OUT', rules)).toBe(false)
    expect(getDefaultWorking('buy4', 'COME_OUT', rules)).toBe(false)
    expect(getDefaultWorking('passOdds', 'COME_OUT', rules)).toBe(false)
    expect(getDefaultWorking('comeOdds', 'COME_OUT', rules)).toBe(false)
  })

  it('hardways on come-out follow the hardwaysOnComeOut table rule', () => {
    expect(getDefaultWorking('hard8', 'COME_OUT', rules)).toBe(false)
    expect(getDefaultWorking('hard8', 'COME_OUT', { ...rules, hardwaysOnComeOut: true })).toBe(true)
  })

  it('everything works during the point phase', () => {
    expect(getDefaultWorking('place6', 'POINT_PHASE', rules)).toBe(true)
    expect(getDefaultWorking('hard8', 'POINT_PHASE', rules)).toBe(true)
  })

  it('lay bets and dont-side odds always work', () => {
    expect(getDefaultWorking('lay4', 'COME_OUT', rules)).toBe(true)
    expect(getDefaultWorking('dontPassOdds', 'COME_OUT', rules)).toBe(true)
  })
})
```

Then implement in `app/engine/betting.ts` (add `BetType`, `GamePhase`, `TableRules` to the type import and the helpers import):

```ts
import { isPlaceBet, isBuyBet, isLayBet, isHardwayBet } from '../utils/betTypes'

/** Single source of truth for default working status (was duplicated in 3 places). */
export function getDefaultWorking(type: BetType, phase: GamePhase, tableRules: TableRules): boolean {
  if (isLayBet(type) || type === 'dontComeOdds' || type === 'dontPassOdds') return true
  if (phase === 'COME_OUT') {
    if (isHardwayBet(type)) return tableRules.hardwaysOnComeOut
    if (isPlaceBet(type) || isBuyBet(type) || type === 'passOdds' || type === 'comeOdds') return false
  }
  return true
}
```

- [ ] **Step 4: Use `getDefaultWorking` at both duplication sites**

1. `useBetManager.ts` (`placeBet`, lines 252-264): replace the whole `let isWorking = true ... always working` block with:
   ```ts
   const isWorking = getDefaultWorking(type, store.phase, store.tableRules)
   ```
   (add `getDefaultWorking` to the `~/engine/betting` import).
2. `useGameLoop.ts` `executeRoll` step 11: in BOTH transition branches replace the hardcoded `bet.isWorking = true` / `= false` assignments with:
   ```ts
   bet.isWorking = getDefaultWorking(bet.type, newPhase, store.tableRules)
   ```
   applied to the same bet-type guard sets as before (place/buy/hardway/passOdds/comeOdds), and import it.

- [ ] **Step 5: Seven-out now RETURNS remaining (OFF) bets instead of sweeping them**

In `useGameLoop.ts` `executeRoll` step 8, replace the entire `if (newPhase === 'SEVEN_OUT') { ... }` block with:

```ts
    if (newPhase === 'SEVEN_OUT') {
      store.sessionStats.pointsMissed++

      // Every working bet already resolved on the 7. Anything still active
      // was OFF — off bets are not at risk, so return them to their owners.
      const offBets = store.activeBets.filter(b => b.status !== 'resolved')
      for (const bet of offBets) {
        const vigRefund = isBuyBet(bet.type) && store.tableRules.buyVigTiming === 'on_bet'
          ? calculateVig(bet.amount)
          : 0
        store.removeBet(bet.id, vigRefund)
      }

      store.advanceShooter()
      store.setPhase('COME_OUT')
    }
```

This also fixes M6: `store.applyResolutions` is no longer called in a loop, so `lastResolutions` always holds the complete roll. `makeResolution` is now unused in `useGameLoop.ts` — remove it from the `~/engine/resolution` import.

- [ ] **Step 6: Verify and commit**

```bash
pnpm vitest run && pnpm lint && pnpm typecheck
git add -A
git commit -m "fix: honor bet working status in point phase; return (not sweep) off bets on seven-out; honor hardwaysOnComeOut"
```

---

### Task 8: Fix M3 — Horn High pays the high portion regardless of which number hit

**Files:**
- Modify: `app/engine/payouts.ts` (`calculateHornHighPayout`), `app/engine/resolution.ts` (hornHigh case), `app/composables/useBetManager.ts` (`placeBet` betPoint), `app/components/table/CrapsTable.vue:136` (zone description)
- Test: `test/unit/payout.test.ts` (append)

- [ ] **Step 1: Failing tests** — append to `test/unit/payout.test.ts` (import `calculateHornHighPayout` from the engine):

```ts
describe('Horn High payout (2 units on the high number, 1 unit on each other)', () => {
  // $5 horn high yo (high = 11), unit = 100 cents
  it('pays the 2-unit portion when the HIGH number hits (roll 11, high 11)', () => {
    // 2 units returned + applyRatio(200, [15,1]) = 200 + 3000 = 3200
    expect(calculateHornHighPayout(500, 11, 11)).toBe(3200)
  })

  it('pays only the 1-unit portion when a LOW number hits (roll 12, high 11)', () => {
    // 1 unit returned + applyRatio(100, [30,1]) = 100 + 3000 = 3100
    expect(calculateHornHighPayout(500, 12, 11)).toBe(3100)
  })

  it('roll 2 with high 2 pays the doubled portion', () => {
    // 200 + applyRatio(200, [30,1]) = 200 + 6000 = 6200
    expect(calculateHornHighPayout(500, 2, 2)).toBe(6200)
  })

  it('non-horn total pays 0', () => {
    expect(calculateHornHighPayout(500, 7, 11)).toBe(0)
  })
})
```

Run — Expected: FAIL (`calculateHornHighPayout` takes 2 args and always pays 2 units).

- [ ] **Step 2: Fix the engine**

Replace `calculateHornHighPayout` in `app/engine/payouts.ts`:

```ts
/**
 * Horn High is a 5-unit bet: 2 units on the player's chosen "high" number and
 * 1 unit on each of the other three horn numbers. Only the portion riding on
 * the rolled number pays; the rest is lost.
 */
export function calculateHornHighPayout(totalBet: number, total: number, highNumber: number): number {
  const unitBet = Math.floor(totalBet / 5)
  const ratio = payouts.horn[total]
  if (!ratio) return 0
  const stake = total === highNumber ? unitBet * 2 : unitBet
  return stake + applyRatio(stake, ratio)
}
```

In `app/engine/resolution.ts`, the hornHigh case becomes (the high number rides on `bet.pointNumber`, defaulting to 11 if a legacy bet lacks it):

```ts
    if (type === 'hornHigh') {
      if (total === 2 || total === 3 || total === 11 || total === 12) {
        const payout = calculateHornHighPayout(amount, total, bet.pointNumber ?? 11)
        return makeResolution(bet, 'win', payout, `Horn High wins on ${total}`)
      }
      return makeResolution(bet, 'lose', 0, 'Horn High loses')
    }
```

- [ ] **Step 3: Store the high number at placement**

In `useBetManager.ts` `placeBet`, after the hardways betPoint block (line ~250), add:

```ts
    // Horn High: the "high" number rides on pointNumber. This sim plays the
    // most common call — horn high yo (11) — unless a number is passed in.
    if (type === 'hornHigh' && betPoint === null) {
      betPoint = 11
    }
```

Update the zone description in `CrapsTable.vue:136` to:

```ts
  'horn-high': { name: 'Horn High (Yo)', desc: '5-unit one-roll bet: 2 units on 11 (the "high"), 1 unit each on 2, 3, 12. The doubled unit pays only when 11 rolls.', edge: '12.22%' },
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm vitest run && pnpm lint && pnpm typecheck
git add -A
git commit -m "fix: horn high pays the doubled unit only when the designated high number rolls"
```

---

### Task 9: Fix M8 — C&E payout config wrong (underpays both legs)

**Files:**
- Modify: `craps.config.ts:45`, `app/engine/payouts.ts` (`calculateCEPayout` comments)
- Test: `test/unit/payout.test.ts` (append)

- [ ] **Step 1: Failing tests** — append (import `calculateCEPayout`):

```ts
describe('C&E payout (1 unit any-craps at 7:1, 1 unit yo at 15:1)', () => {
  // $2 C&E → unit = 100 cents. Net on total bet: craps 3:1, eleven 7:1.
  it('craps roll returns unit + 7:1 (net +600 on 200 = 3:1)', () => {
    expect(calculateCEPayout(200, 2)).toBe(800)
    expect(calculateCEPayout(200, 3)).toBe(800)
    expect(calculateCEPayout(200, 12)).toBe(800)
  })

  it('eleven returns unit + 15:1 (net +1400 on 200 = 7:1)', () => {
    expect(calculateCEPayout(200, 11)).toBe(1600)
  })

  it('any other total pays 0', () => {
    expect(calculateCEPayout(200, 7)).toBe(0)
  })
})
```

Run — Expected: FAIL (config has craps [3,1] / eleven [7,1], producing 400 and 800).

- [ ] **Step 2: Fix the config**

`craps.config.ts:45` — the unit-level ratios must match the standalone Any Craps (7:1) and Yo (15:1) bets; the popular "3:1 craps / 7:1 eleven" phrasing describes the NET on the combined 2-unit bet, which these values produce:

```ts
    ce: { craps: [7, 1] as [number, number], eleven: [15, 1] as [number, number] },
```

In `app/engine/payouts.ts` `calculateCEPayout`, the comments `// Yo unit wins at 15:1, craps unit lost` and `// Craps unit wins at 7:1, yo unit lost` are now correct — leave them. The zone tooltip 'Pays 3:1 on craps, 7:1 on eleven' (`CrapsTable.vue:134`) states net-on-total and is now accurate — leave it.

- [ ] **Step 3: Divisibility validation in whole-dollar units (L1)**

In `useBetManager.ts` `validateBet` (lines 170-181), the `% 4/5/2` checks operate on cents, so any whole-dollar amount passes and odd unit splits silently lose cents. Replace the three checks:

```ts
    // Multi-unit prop bets must be placed in whole-dollar unit multiples
    if (type === 'horn' && amount % 400 !== 0) {
      return { valid: false, reason: 'Horn is a 4-unit bet — use a multiple of $4' }
    }
    if (type === 'hornHigh' && amount % 500 !== 0) {
      return { valid: false, reason: 'Horn High is a 5-unit bet — use a multiple of $5' }
    }
    if (type === 'crapsEleven' && amount % 200 !== 0) {
      return { valid: false, reason: 'C&E is a 2-unit bet — use a multiple of $2' }
    }
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm vitest run && pnpm lint && pnpm typecheck
git add -A
git commit -m "fix: correct C&E unit payouts (7:1 craps unit, 15:1 yo unit); whole-dollar unit validation for multi-unit props"
```

---

### Task 10: Fix M9 — hop bets can never win; add target picker

**Files:**
- Modify: `app/composables/useBetManager.ts` (`placeBet` validation), `app/pages/table.vue` (picker modal)
- Test: `test/unit/resolver.test.ts` (append)

- [ ] **Step 1: Failing engine tests** — append to `test/unit/resolver.test.ts`:

```ts
describe('resolveRoll – Hop bets', () => {
  it('hop hard 8 wins on 4+4', () => {
    const bet = makeBet({ type: 'hopHard', pointNumber: 8 })
    const res = resolveRoll(makeRoll(4, 4), [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // 30:1 → 1000 + 30000 = 31000
    expect(r.payout).toBe(31000)
  })

  it('hop hard 8 loses on easy 8', () => {
    const bet = makeBet({ type: 'hopHard', pointNumber: 8 })
    const res = resolveRoll(makeRoll(5, 3), [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(findResolution(res, bet.id)!.outcome).toBe('lose')
  })

  it('hop easy 6 wins on 4+2 and loses on 3+3', () => {
    const bet = makeBet({ type: 'hopEasy', pointNumber: 6 })
    const win = resolveRoll(makeRoll(4, 2), [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(findResolution(win, bet.id)!.outcome).toBe('win')
    // 15:1 → 1000 + 15000 = 16000
    expect(findResolution(win, bet.id)!.payout).toBe(16000)
    const bet2 = makeBet({ type: 'hopEasy', pointNumber: 6 })
    const lose = resolveRoll(makeRoll(3, 3), [bet2], 'POINT_PHASE', defaultTableRules, 8)
    expect(findResolution(lose, bet2.id)!.outcome).toBe('lose')
  })
})
```

Run — Expected: PASS already (the engine resolution logic was always correct; the bug is that the app never sets `pointNumber`). These tests lock the engine behavior; the app-side fix follows.

- [ ] **Step 2: Require a target at placement**

In `useBetManager.ts` `placeBet`, after the hornHigh default added in Task 8:

```ts
    // Hop bets are meaningless without a target total
    if ((type === 'hopEasy' || type === 'hopHard') && betPoint === null) {
      console.warn('Hop bets require a target total')
      return null
    }
    if (type === 'hopHard' && betPoint !== null && ![4, 6, 8, 10].includes(betPoint)) {
      console.warn('Hop hard target must be 4, 6, 8, or 10')
      return null
    }
    if (type === 'hopEasy' && betPoint !== null && (betPoint < 3 || betPoint > 11)) {
      console.warn('Hop easy target must be between 3 and 11')
      return null
    }
```

- [ ] **Step 3: Target picker in `table.vue`**

Script additions:

```ts
// ── Hop bet target picker ──
const hopPicker = ref<{ open: boolean; type: 'hopEasy' | 'hopHard' }>({ open: false, type: 'hopHard' })
const hopTargets = computed(() =>
  hopPicker.value.type === 'hopHard' ? [4, 6, 8, 10] : [3, 4, 5, 6, 7, 8, 9, 10, 11]
)
function placeHopBet(target: number) {
  hopPicker.value.open = false
  placeBet(hopPicker.value.type, store.selectedChipValue, 'hero', target)
}
```

In `handleZoneClick`, before the final `placeBet(...)` call:

```ts
  if (betType === 'hopEasy' || betType === 'hopHard') {
    hopPicker.value = { open: true, type: betType }
    if (autoRoll.value) stopAutoRollTimer()
    return
  }
```

Template — add next to the existing `UModal`:

```html
    <!-- Hop bet target picker -->
    <UModal
      v-model:open="hopPicker.open"
      :title="hopPicker.type === 'hopHard' ? 'Hop Hard — pick the pair total' : 'Hop Easy — pick the total'"
      description="One-roll bet on the next roll landing your number the chosen way."
    >
      <template #body>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="t in hopTargets"
            :key="t"
            :label="String(t)"
            color="primary"
            variant="soft"
            size="lg"
            @click="placeHopBet(t)"
          />
        </div>
      </template>
    </UModal>
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm vitest run && pnpm lint && pnpm typecheck
git add -A
git commit -m "fix: hop bets get a target number (picker UI) and can actually win"
```

---

### Task 11: Fix M4 — bet-ID counter collides with restored sessions

**Files:**
- Modify: `app/utils/betTypes.ts:188-195`, `app/stores/craps.ts` (`initializeGame`, `loadFromLocalStorage`)
- Test: `test/unit/store.test.ts` (append)

- [ ] **Step 1: Failing test** — append to `test/unit/store.test.ts`:

```ts
describe('bet id continuity across reload', () => {
  it('new bet ids never collide with restored ones', () => {
    const store = initStore()
    store.addBet(makeBet({ id: 'bet-1' }))
    store.addBet(makeBet({ id: 'bet-7', type: 'field' }))
    store.saveToLocalStorage()

    setActivePinia(createPinia())
    const fresh = useCrapsStore()
    fresh.loadFromLocalStorage()
    const newId = generateBetId()
    expect(fresh.activeBets.map(b => b.id)).not.toContain(newId)
    expect(newId).toBe('bet-8')
  })
})
```

Run — Expected: FAIL (fresh module state issues `bet-1`… — note: run this file in isolation to see the raw failure; module state persists within a worker, which is exactly the drift the fix kills).

- [ ] **Step 2: Implement**

In `app/utils/betTypes.ts`, after `resetBetIdCounter`:

```ts
/** After restoring persisted bets, advance the counter past every restored id. */
export function syncBetIdCounter(existingIds: string[]): void {
  let max = 0
  for (const id of existingIds) {
    const m = id.match(/^bet-(\d+)$/)
    if (m) max = Math.max(max, parseInt(m[1]!))
  }
  nextBetId = Math.max(nextBetId, max + 1)
}
```

In `app/stores/craps.ts`: add `import { crapsConfig } from '~~/craps.config'`-style value import line for the utils: `import { resetBetIdCounter, syncBetIdCounter } from '~/utils/betTypes'`. Then:
- `initializeGame` — after `this.activeBets = []` add `resetBetIdCounter()`.
- `loadFromLocalStorage` — after `this.activeBets = data.activeBets ?? []` add `syncBetIdCounter(this.activeBets.map((b: ActiveBet) => b.id))`.

- [ ] **Step 3: Verify and commit**

```bash
pnpm vitest run && pnpm lint && pnpm typecheck
git add -A
git commit -m "fix: sync bet-id counter with restored session to prevent id collisions"
```

---

### Task 12: Fix M5 — advisor house edges read from config

**Files:**
- Modify: `app/composables/useAdvisor.ts` (lines 372-426 region)

- [ ] **Step 1: Add a formatting helper and replace every hardcoded edge**

In `useAdvisor.ts`, near the top of the composable add:

```ts
  const edges = crapsConfig.houseEdges
  /** Config stores fractions (0.01414); the advisor displays percents (1.41). */
  const pct = (edge: number) => +(edge * 100).toFixed(2)
```

(Ensure `crapsConfig` is imported; it already is if the file references it — verify with grep.)

Exact literal → replacement map (all in the `available.push` calls):

| Line | Old | New |
|---|---|---|
| 372 | `edge: 1.41` | `edge: pct(edges.passLine)` |
| 375 | `edge: 1.36` | `edge: pct(edges.dontPass)` |
| 377, 415 | `edge: store.tableRules.fieldTwelvePayout === 3 ? 2.78 : 5.56` | `edge: pct(store.tableRules.fieldTwelvePayout === 3 ? edges.field2x3x : edges.field2x2x)` |
| 385 | `edge: 1.41` | `edge: pct(edges.come)` |
| 388 | `edge: 1.36` | `edge: pct(edges.dontCome)` |
| 394 | `edge: 1.52` | `edge: pct(edges.place6)` |
| 400 | `edge: 4.0` | `edge: pct(edges.place5)` |
| 408 | `edge: 1.67` | `edge: pct(edges.buy4VigOnWin)` |
| 410 | `edge: 6.67` | `edge: pct(edges.place4)` |
| 418, 421 | `edge: 9.09` | `edge: pct(edges.hard6)` |
| 424 | `edge: 11.11` | `edge: pct(edges.anyCraps)` |
| 425 | `edge: 11.11` | `edge: pct(edges.yo)` |
| 426 | `edge: 16.67` | `edge: pct(edges.any7)` |

Also scan the rest of the file (`grep -n "edge" app/composables/useAdvisor.ts`) for any other hardcoded percentages in recommendation objects (the 130-309 region builds text strings — replace numeric edge fields the same way where a matching `houseEdges` key exists; leave prose strings alone).

- [ ] **Step 2: Verify (rendered values unchanged) and commit**

`pct()` reproduces every displayed value exactly (0.01414→1.41, 0.01515→1.52, 0.04→4, 0.16667→16.67...). The advisor isn't unit-importable (Nuxt auto-imports), so verification is:

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "refactor: advisor house edges read from craps.config instead of hardcoded literals"
```

---

### Task 13: Fix H2/M7 — bankroll history cap, throttled persistence, flush on leave; executeRoll integration test

**Files:**
- Modify: `app/stores/craps.ts` (`applyResolutions`, `saveToLocalStorage`), `app/composables/useGameLoop.ts` (step 12), `app/pages/table.vue` (flush listeners)
- Create: `test/nuxt/game-loop.nuxt.test.ts`

- [ ] **Step 1: Failing store test (cap)** — append to `test/unit/store.test.ts`:

```ts
import { crapsConfig } from '../../craps.config'

describe('bankroll history cap', () => {
  it('trims per-player history to stats.bankrollHistorySize', () => {
    const store = initStore()
    const cap = crapsConfig.stats.bankrollHistorySize
    for (let i = 0; i < cap + 50; i++) {
      const bet = makeBet({ type: 'field', amount: 100 })
      store.addBet(bet)
      store.applyResolutions([{
        betId: bet.id, betType: 'field', owner: 'hero',
        outcome: 'lose', payout: 0, netGain: -100, description: 'x',
      }])
    }
    expect(store.hero!.bankrollHistory.length).toBeLessThanOrEqual(cap)
  })
})
```

Run — Expected: FAIL (length = cap + 51).

- [ ] **Step 2: Enforce the cap**

In `app/stores/craps.ts` `applyResolutions`, right after `player.bankrollHistory.push(player.bankroll)`:

```ts
        if (player.bankrollHistory.length > crapsConfig.stats.bankrollHistorySize) {
          player.bankrollHistory.splice(0, player.bankrollHistory.length - crapsConfig.stats.bankrollHistorySize)
        }
```

Run — Expected: PASS.

- [ ] **Step 3: Throttle persistence**

In `useGameLoop.ts` `executeRoll`, replace step 12 (`store.saveToLocalStorage()`) with:

```ts
    // 12. Persist (throttled: every 10th roll and on seven-out; table.vue
    // flushes on pagehide/unmount so at most ~9 rolls are ever at risk)
    if (store.rollNumber % 10 === 0 || newPhase === 'SEVEN_OUT') {
      store.saveToLocalStorage()
    }
```

In `table.vue`, extend the existing lifecycle wiring (near `onMounted(() => window.addEventListener('keydown', onKeydown))`):

```ts
function flushSession() { store.saveToLocalStorage() }
onMounted(() => window.addEventListener('pagehide', flushSession))
onUnmounted(() => {
  window.removeEventListener('pagehide', flushSession)
  flushSession()
})
```

- [ ] **Step 4: executeRoll integration test (nuxt project)**

Create `test/nuxt/game-loop.nuxt.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCrapsStore } from '../../app/stores/craps'
import { useGameLoop } from '../../app/composables/useGameLoop'
import { useBetManager } from '../../app/composables/useBetManager'

function freshGame() {
  const store = useCrapsStore()
  store.clearSession()
  store.initializeGame({
    heroName: 'Tester', bankroll: 100000, stakeLevel: 2,
    tableRules: {}, bots: [],
  })
  return store
}

describe('executeRoll (store integration)', () => {
  beforeEach(() => { freshGame() })

  it('pass line come-out natural pays and returns to come-out', () => {
    const store = useCrapsStore()
    const { placeBet } = useBetManager()
    const { executeRoll } = useGameLoop()
    placeBet('pass', 1000, 'hero')
    expect(store.hero!.bankroll).toBe(99000)
    executeRoll(4, 3) // 7 = natural
    expect(store.hero!.bankroll).toBe(101000)
    expect(store.phase).toBe('COME_OUT')
    expect(store.point).toBeNull()
  })

  it('seven-out RETURNS an off place bet instead of losing it', () => {
    const store = useCrapsStore()
    const { placeBet, toggleBetWorking } = useBetManager()
    const { executeRoll } = useGameLoop()
    placeBet('pass', 1000, 'hero')
    executeRoll(2, 2) // point 4 established
    expect(store.point).toBe(4)
    const place = placeBet('place6', 1200, 'hero')!
    toggleBetWorking(place.id) // turn the place bet OFF
    const before = store.hero!.bankroll
    executeRoll(3, 4) // seven out: pass loses (already deducted), OFF place returned
    expect(store.hero!.bankroll).toBe(before + 1200)
    expect(store.phase).toBe('COME_OUT')
  })

  it('cannot take down a pass bet after the point is established (H1)', () => {
    const store = useCrapsStore()
    const { placeBet, removeBet } = useBetManager()
    const { executeRoll } = useGameLoop()
    const pass = placeBet('pass', 1000, 'hero')!
    executeRoll(3, 3) // point 6
    expect(removeBet(pass.id)).toBe(false)
    expect(store.activeBets.find(b => b.id === pass.id)).toBeTruthy()
  })
})
```

Run: `pnpm vitest run --project nuxt` — Expected: PASS. (If the nuxt environment errors on boot, fix the environment issue — do not silently move these to unit env; they exist to exercise the composable+store wiring.)

- [ ] **Step 5: Verify everything and commit**

```bash
pnpm vitest run && pnpm lint && pnpm typecheck
git add -A
git commit -m "perf: cap bankroll history, throttle localStorage writes; add executeRoll integration tests"
```

---

### Task 14: CrapsTable render performance + decomposition + dead code

**Files:**
- Create: `app/utils/zoneDescriptions.ts`, `app/components/table/BetChipsLayer.vue`, `app/components/table/StudyTooltip.vue`
- Modify: `app/components/table/CrapsTable.vue`, `app/pages/table.vue:105-116,360`
- Delete: `app/components/table/BetChip.vue`, `app/components/table/Puck.vue`, `app/assets/reference/Craps_table_layout.svg`
- Test: manual + existing suite (component layer has no unit tests; keep the change mechanical)

- [ ] **Step 1: Move `zoneDescriptions` to `app/utils/zoneDescriptions.ts`**

Move the record from `CrapsTable.vue:106-139` verbatim:

```ts
export interface ZoneDescription { name: string; desc: string; edge: string }

export const zoneDescriptions: Record<string, ZoneDescription> = {
  // ... the 34 entries exactly as they are in CrapsTable.vue:107-138 (including the Task 8 horn-high edit)
}
```

`CrapsTable.vue` imports it: Nuxt auto-imports `app/utils/`, so simply deleting the local const and keeping references compiles — but add the explicit `import { zoneDescriptions } from '~/utils/zoneDescriptions'` anyway for greppability.

- [ ] **Step 2: Precompute zone totals as a Map; disabled zones as a Set**

In `CrapsTable.vue` script, replace `betsForZone` + `zoneBetTotal` (lines 141-151) with:

```ts
const zoneTotals = computed(() => {
  const totals = new Map<string, number>()
  for (const bet of props.activeBets) {
    if (bet.status === 'resolved') continue
    const zone = BET_TYPE_TO_ZONE[bet.type]
    totals.set(zone, (totals.get(zone) ?? 0) + bet.amount)
  }
  return totals
})

function zoneBetTotal(zoneId: string): number {
  return zoneTotals.value.get(zoneId) ?? 0
}
```

Change the `disabledZones` prop type from `string[]` to `Set<string>` (`disabledZones?: Set<string>`, default `() => new Set()`), and `isDisabled` to `props.disabledZones.has(zoneId)`. In `table.vue`, change the `disabledZones` computed (lines 105-116) to build and return a `Set<string>`, add `const EMPTY_SET = new Set<string>()` in the script (a template-inline `new Set()` would allocate per render), and change the binding at line 360 to `:disabled-zones="takeDownMode ? EMPTY_SET : disabledZones"`.

- [ ] **Step 3: Extract `BetChipsLayer.vue`**

Create `app/components/table/BetChipsLayer.vue` whose template root is the `<g id="bet-chips" pointer-events="none">` group moved verbatim from `CrapsTable.vue:715-812`, with script:

```html
<script setup lang="ts">
const props = defineProps<{
  zoneTotals: Map<string, number>
}>()

function zoneBetTotal(zoneId: string): number {
  return props.zoneTotals.get(zoneId) ?? 0
}
</script>
```

First move `formatChipAmount` (currently `CrapsTable.vue:154-158`) into `app/utils/format.ts` as a shared export (auto-imported by Nuxt, so all three consumers — BetChipsLayer, StudyTooltip, CrapsTable's aria labels — use it without import lines):

```ts
/** Format cents to dollars for chip display ($5, $250, 1.5k) */
export function formatChipAmount(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}k`
  return `$${dollars}`
}
```

Move the chip-related scoped styles (`.chip-text`, `.chip-text-sm`, `.chip-text-xs`, `.label-odds-chip` — find them in CrapsTable's style block) into this component. In `CrapsTable.vue`, replace the moved group with:

```html
    <TableBetChipsLayer :zone-totals="zoneTotals" />
```

(Component in the same directory → auto-registered as `TableBetChipsLayer`.) SVG-fragment components are valid: the child's root `<g>` renders inside the parent `<svg>`.

- [ ] **Step 4: Extract `StudyTooltip.vue`**

Move the HTML overlay (`CrapsTable.vue:829-842`) plus `getStudyExplanation` (73-103) and the `.study-tooltip*` styles into `app/components/table/StudyTooltip.vue`:

```html
<script setup lang="ts">
import { zoneDescriptions } from '~/utils/zoneDescriptions'

const props = defineProps<{
  zoneId: string
  x: number
  y: number
  hasBetAmount: number
  disabled: boolean
  gamePhase: string
}>()
</script>
```

`getStudyExplanation` becomes a computed inside this component using the props (`hasBetAmount` replaces the `zoneBetTotal` call; `disabled` replaces `isDisabled`; keep the phase-message logic verbatim; use the shared `formatChipAmount` from `~/utils/format`). CrapsTable renders:

```html
  <TableStudyTooltip
    v-if="studyMode && studyHoveredZone"
    :zone-id="studyHoveredZone"
    :x="studyTooltipPos.x"
    :y="studyTooltipPos.y"
    :has-bet-amount="zoneBetTotal(studyHoveredZone)"
    :disabled="isDisabled(studyHoveredZone)"
    :game-phase="gamePhase"
  />
```

- [ ] **Step 5: Delete dead code**

1. `git rm app/components/table/BetChip.vue app/components/table/Puck.vue` (both unreferenced — confirm with `grep -rn "TableBetChip\|TablePuck" app/`).
2. In `CrapsTable.vue`: delete the `devReferenceUnderlay` prop, its `withDefaults` entry, and the `<image v-if="devReferenceUnderlay" ...>` block (lines 205-215); then `git rm app/assets/reference/Craps_table_layout.svg` (41 KB bundled for nothing).
3. Delete the dead `.zone-fill-odds` CSS class (`CrapsTable.vue:858-860`) and remove `.zone:hover .zone-fill-odds` from the hover selector (keep `.zone:hover .zone-fill`).
4. In `app/stores/craps.ts`: delete the `animating: false` state field and the `!state.animating` clause in `canRoll`; in `table.vue` delete line `store.animating = false`. (The page manages `diceRolling` itself; the store flag was write-only.)
5. In `app/stores/craps.ts` `chipDenominations`: delete the duplicate first branch (`if (min >= 50000) return [2500, 10000, 50000, 100000]` — identical to the `>= 10000` branch below it).
6. In `app/utils/betTypes.ts`: remove `'no_action'` from the `BetResolution['outcome']` union (nothing ever produces it) and fix the stale comment in `makeResolution` if it references no_action.

- [ ] **Step 6: Verify (build + manual) and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm generate
pnpm dev
```
Manually: place bets on several zones — chips render at the same positions; puck moves; study mode tooltip works; take-down mode works. Then:

```bash
git add -A
git commit -m "perf: memoized zone totals, Set-based disabled zones, extract chip/tooltip layers; remove dead components and 41KB dev asset"
```

---

### Task 15: Accessibility — keyboard-operable betting zones

**Files:**
- Modify: `app/components/table/CrapsTable.vue` (all ~40 `<g class="zone">` elements + svg root + styles)

- [ ] **Step 1: Add a11y helpers to the CrapsTable script**

```ts
import { zoneDescriptions } from '~/utils/zoneDescriptions'

function zoneAriaLabel(zoneId: string): string {
  const name = zoneDescriptions[zoneId]?.name ?? zoneId
  const total = zoneBetTotal(zoneId)
  return total > 0 ? `${name}, ${formatChipAmount(total)} bet placed` : name
}

/** Delegated keyboard activation for betting zones (Enter / Space). */
function handleZoneKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const zoneEl = (event.target as Element)?.closest?.('.zone')
  if (!zoneEl?.id) return
  event.preventDefault()
  handleZoneClick(zoneEl.id)
}
```

(`formatChipAmount` lives in `~/utils/format` after Task 14 and is auto-imported.)

Add `@keydown="handleZoneKeydown"` and `role="group"` to the root `<svg>` element.

- [ ] **Step 2: Instrument every zone `<g>`**

For each of the ~40 interactive `<g id="..." class="zone" ...>` elements (enumerate them with `grep -n 'class="zone"' app/components/table/CrapsTable.vue`), add these attributes, substituting each zone's own id:

```html
      <g
        id="place-4"
        class="zone"
        :class="{ disabled: isDisabled('place-4') }"
        role="button"
        :tabindex="isDisabled('place-4') ? -1 : 0"
        :aria-label="zoneAriaLabel('place-4')"
        :aria-disabled="isDisabled('place-4') || undefined"
        @click="handleZoneClick('place-4')"
      >
```

Disabled zones drop out of the tab order (`tabindex -1`) — no dead stops while tabbing. Skip the two empty placeholder groups (`come-odds`, `dont-come-odds` — they have no rendered shapes; give them `tabindex="-1"` only, or leave untouched).

- [ ] **Step 3: Visible focus indicator**

Append to CrapsTable's scoped styles:

```css
/* ===== Keyboard focus ===== */
.zone:focus {
  outline: none;
}

.zone:focus-visible .zone-fill,
.zone:focus-visible .zone-fill-prop,
.zone:focus-visible .zone-fill-odds-area {
  stroke: #fbbf24;
  stroke-width: 3;
}
```

- [ ] **Step 4: Verify and commit**

`pnpm dev`, then: Tab reaches the first enabled zone; focus ring is clearly visible; Enter places a bet; disabled zones are skipped; a screen-reader (VoiceOver quick check if available) announces "Pass Line, button".

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "a11y: keyboard-operable betting zones with roles, labels, and visible focus"
```

---

### Task 16: Accessibility & UX — reduced motion, focus ring, toasts, index keys, timer cleanup (H3)

**Files:**
- Modify: `app/assets/css/main.css`, `app/spa-loading-template.html`, `app/components/table/ChipTray.vue:45`, `app/pages/table.vue`, `app/components/stats/AdvisorPanel.vue:143,296,310`, `app/pages/history.vue:56`, `app/stores/craps.ts` (chip action)

- [ ] **Step 1: Reduced motion**

Append to `app/assets/css/main.css`:

```css
/* Respect OS-level reduced-motion: freeze all animation/transitions */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Add the same block inside the `<style>` of `app/spa-loading-template.html` (it renders before main.css loads).

- [ ] **Step 2: ChipTray — visible keyboard focus + store action**

`ChipTray.vue:45`: change `focus:outline-none` to `focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900` (sky ≠ amber so focus and selection are distinguishable).

Replace the direct mutation (`ChipTray.vue:35` `store.selectedChipValue = value`) with a store action: add to `app/stores/craps.ts` actions:

```ts
    setSelectedChip(value: number) {
      this.selectedChipValue = value
    },
```

and call `store.setSelectedChip(value)` in `selectChip`.

- [ ] **Step 3: Toast feedback for rejected bet actions in `table.vue`**

Script: `const toast = useToast()` (Nuxt UI auto-import). In `handleZoneClick`:
- Take-down branch: before `removeBet(bet.id)`, guard with the engine rule (import `canRemoveBet` from `~/engine/betting`):
  ```ts
      if (bet) {
        const removal = canRemoveBet(bet, store.point)
        if (!removal.allowed) {
          toast.add({ title: 'Cannot take down', description: removal.reason, color: 'warning' })
          return
        }
        removeBet(bet.id)
      }
  ```
- Placement branch: after `const placed = placeBet(betType, store.selectedChipValue, 'hero')`, when `placed` is null re-run `validateBet` with the same gameState object shape used at lines 93-97 and toast the `reason`:
  ```ts
      if (!placed) {
        const validation = validateBet(betType, store.selectedChipValue, 'hero', {
          phase: store.phase, point: store.point, activeBets: store.activeBets,
          tableRules: store.tableRules, rollNumber: store.rollNumber,
          dontBetRemovedThisCycle: store.dontBetRemovedThisCycle
        })
        toast.add({ title: 'Bet not placed', description: validation.reason || 'Not available right now', color: 'warning' })
      }
  ```

- [ ] **Step 4: Fix H3 — tracked timers**

In `table.vue` script, add:

```ts
// All one-shot timers are tracked so leaving the table cancels them
const pendingTimers = new Set<ReturnType<typeof setTimeout>>()
function trackedTimeout(fn: () => void, ms: number) {
  const id = setTimeout(() => {
    pendingTimers.delete(id)
    fn()
  }, ms)
  pendingTimers.add(id)
}
```

Replace the three untracked `setTimeout(...)` calls with `trackedTimeout(...)`:
- the roll-delay timer in `handleRoll` (line 190)
- the auto-roll re-arm (line 202)
- both nested floater timeouts in `showPayoutAnimations` (lines 166-172)

Extend `onUnmounted` (merge with Task 13's flush listener):

```ts
onUnmounted(() => {
  stopAutoRollTimer()
  pendingTimers.forEach(t => clearTimeout(t))
  pendingTimers.clear()
  window.removeEventListener('pagehide', flushSession)
  flushSession()
})
```

Delete the dead `autoRollTimer` ref (`table.vue:42`) and its clear in `stopAutoRollTimer` (it is never assigned).

- [ ] **Step 5: Stable list keys**

- `app/pages/history.vue:56`: the list renders `store.rollHistory` (newest first). Key by absolute roll number: `:key="store.rollNumber - i"`.
- `AdvisorPanel.vue:143` (recommendations): `:key="rec.type"` (unique per list — verify with the surrounding v-for variable name; if the iterated item exposes `type`, use it, else `name`).
- `AdvisorPanel.vue:296` (insights, strings): `:key="insight"` (verify variable name in the v-for).
- `AdvisorPanel.vue:310` (last-20 rolls from rollHistory slice): `:key="store.rollNumber - i"`.

- [ ] **Step 6: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
```
Manual: enable "reduce motion" in macOS accessibility settings → dice no longer shake; click a disabled zone's bet in take-down mode → toast explains; leave the table mid-auto-roll → no console errors.

```bash
git add -A
git commit -m "a11y/ux: reduced motion, chip focus ring, rejection toasts, stable list keys, tracked timers"
```

---

### Task 17: Responsive table page (no horizontal overflow at 390px)

**Files:**
- Modify: `app/pages/table.vue` (header + sidebar), `app/components/table/ChipTray.vue:40`

- [ ] **Step 1: Chip tray wraps**

`ChipTray.vue:40`: add `flex-wrap` → `class="chip-tray flex flex-wrap items-center justify-center gap-3 py-1.5 px-4"`.

- [ ] **Step 2: Header wraps instead of overflowing**

`table.vue` header (line 258): `class="flex flex-wrap items-center justify-between gap-y-1 px-4 py-2 bg-neutral-900/80 border-b border-neutral-800"`. Same on the right-hand button cluster (line 275): add `flex-wrap`.

- [ ] **Step 3: Sidebar overlays on small screens**

Replace the `<aside>` classes (lines 422-424):

```html
      <aside
        class="border-l border-neutral-800 shrink-0 transition-all duration-200 overflow-hidden min-h-0
               fixed inset-y-0 right-0 z-30 w-80 max-w-[85vw] bg-neutral-950
               lg:static lg:z-auto lg:bg-transparent lg:w-80"
        :class="showSidebar ? 'translate-x-0 lg:max-w-80' : 'translate-x-full lg:translate-x-0 lg:max-w-0 lg:border-l-0'"
      >
```

On `lg+` this behaves exactly as before (width collapse); below `lg` it slides over the table as a drawer. Default the sidebar closed on small screens:

```ts
const showSidebar = ref(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true)
```

- [ ] **Step 4: Verify and commit**

`pnpm dev`, devtools responsive mode at 390×844: no horizontal scrolling; chips wrap; sidebar opens as overlay and closes; table SVG scales.

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "responsive: wrap header/chip tray, sidebar becomes drawer below lg"
```

---

### Task 18: Deploy hardening — CSP, HSTS, caching, typecheck gate, doc reconciliation

**Files:**
- Modify: `netlify.toml`, `nuxt.config.ts`, `docs/craps-sim-doc06-security.md`, `CHANGELOG.md`

- [ ] **Step 1: Pin icons to the local bundle**

All icons in the app are statically named `i-lucide-*` / `i-simple-icons-github` and both collections are installed. Make client bundling explicit in `nuxt.config.ts`:

```ts
  icon: {
    clientBundle: {
      scan: true
    }
  },
```

- [ ] **Step 2: Rewrite `netlify.toml`**

```toml
[build]
  command = "pnpm typecheck && pnpm generate"
  publish = "dist"

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
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    # script-src 'unsafe-inline' is required by Nuxt's inline bootstrap in SPA
    # mode on a static host (no nonces without SSR). Revisit with nuxt-security
    # hash-based CSP if this ever needs to go.
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"

[[headers]]
  for = "/_nuxt/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Dropped: `https://fonts.gstatic.com` (fonts self-hosted under `/_fonts/`) and `https://api.iconify.design` (icons bundled). Added: HSTS, Permissions-Policy, `base-uri`/`form-action`/`frame-ancestors`/`object-src`, immutable caching for hashed assets.

- [ ] **Step 3: Verify the build makes no external references**

```bash
pnpm generate
grep -ri "api.iconify\|fonts.gstatic" .output/public/ && echo "FOUND — do not drop the CSP allowance" || echo "clean"
pnpm preview
```
Expected: `clean`. In the preview, open the table page and confirm every icon renders and the console shows no CSP violations. **If any icon fails to load**, find its name in the console, confirm it's in the installed `@iconify-json` sets, and fix the bundling — only re-add the `connect-src` allowance as a last resort (and say so in the commit).

- [ ] **Step 4: Reconcile `docs/craps-sim-doc06-security.md`**

1. `grep -n "yarn" docs/craps-sim-doc06-security.md` — replace all 4 references with the pnpm equivalents (`pnpm install --frozen-lockfile`, `pnpm-lock.yaml`).
2. Find the CSP section promising `script-src 'self'` (~line 117) and update it to the deployed policy, with one sentence of rationale: Nuxt SPA mode emits an inline bootstrap script; a static host cannot mint per-request nonces, so `'unsafe-inline'` is accepted and documented, with hash-based CSP via `nuxt-security` listed as the future tightening path.

- [ ] **Step 5: CHANGELOG + commit**

Add a CHANGELOG entry summarizing this plan's user-visible changes (bug fixes: contract-bet takedown, working toggle, horn high, C&E, hop bets; a11y: keyboard zones, reduced motion; perf: rapid-mode; deploy: hardened headers).

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "chore(deploy): harden CSP and headers, gate build on typecheck, reconcile security doc"
```

---

### Task 19: Final verification sweep

**Files:** none (verification only; small fixes as discovered)

- [ ] **Step 1: Full gate**

```bash
pnpm lint && pnpm typecheck && pnpm run test:coverage && pnpm generate
```
Expected: all pass; engine coverage ≥ 90% statements. Paste actual numbers into the task notes.

- [ ] **Step 2: Manual smoke of every fixed behavior** (`pnpm dev`)

1. New game → place Pass → establish point → take-down mode → clicking Pass shows the contract toast and the bet stays. (H1)
2. Establish point → place 6 → toggle it off (via whatever UI exposes working state — if none exists, verify via the integration test only and note it) → seven-out → bankroll gets the place bet back. (M1)
3. Place a $5 Horn High → roll until a low horn number hits → payout matches 1-unit math. (M3 — rapid mode helps)
4. Place a $2 C&E → craps hit returns $8 total. (M8)
5. Click Hop (Hard) → picker opens → pick 8 → auto-roll until 4+4 lands → history/bankroll shows the 31x return. (M9)
6. Reload mid-session → place new bets → no bet vanishes or double-resolves. (M4)
7. Rapid + auto-roll for ~2 minutes → UI stays responsive; localStorage writes are visibly throttled (devtools Application tab). (H2/M7)
8. Keyboard-only: Tab to a zone, Enter places a bet. (Task 15)
9. 390px viewport: no horizontal scroll. (Task 17)

- [ ] **Step 3: Push and hand back**

```bash
git push -u origin fix/engine-and-hardening
```
Report: branch name, test counts before/after, coverage numbers, and the list of behavior changes a reviewer should scrutinize (seven-out off-bet returns, C&E payouts, horn-high payouts).

---

## Explicitly out of scope (noted for follow-up, not in this plan)

- Making the invisible buy/lay/come-odds SVG zones fully interactive (feature work — today they're placeable only via the advisor).
- Real Playwright e2e suite (scaffolding removed in Task 1; re-add deliberately).
- `NuxtErrorBoundary` / designed 404 page.
- Hash-based CSP via `nuxt-security` (documented as the future path in doc06).
- Advisor recommendation memoization beyond Vue's computed caching (L7 — revisit only if profiling shows it matters).
