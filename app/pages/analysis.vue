<script setup lang="ts">
const store = useCrapsStore()

// Load session if needed (user navigated directly)
onMounted(() => {
  if (store.phase === 'SETUP') {
    store.loadFromLocalStorage()
  }
})

const hasSession = computed(() => store.phase !== 'SETUP')
const hero = computed(() => store.hero)
const sessionStats = computed(() => store.sessionStats)
const rollHistory = computed(() => store.rollHistory)

// Roll distribution
const rollDistribution = computed(() => {
  const counts: Record<number, number> = {}
  for (let i = 2; i <= 12; i++) counts[i] = 0
  for (const roll of rollHistory.value) {
    counts[roll.total]!++
  }
  return counts
})

const totalRolls = computed(() => sessionStats.value.rollsWitnessed || 1)

// Expected probabilities (out of 36)
const expectedProbs: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1
}

// Bet type performance
const betTypeEntries = computed(() => {
  return Object.entries(sessionStats.value.betTypeStats)
    .filter(([, stats]) => stats.timesPlaced > 0)
    .sort(([, a], [, b]) => b.timesPlaced - a.timesPlaced)
})
</script>

<template>
  <div class="flex-1 bg-neutral-950 overflow-y-auto">
    <div class="max-w-[800px] mx-auto px-4 py-8 space-y-6">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-neutral-200">
          Analysis
        </h1>
        <p class="text-sm text-neutral-500">
          Statistical breakdown of your session performance.
        </p>
      </div>

      <template v-if="hasSession">
        <!-- P&L Overview -->
        <div class="rounded-xl bg-neutral-900/80 border border-neutral-800 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p class="text-[10px] uppercase tracking-widest text-neutral-500">
              Bankroll
            </p>
            <p class="text-xl font-mono text-neutral-200">
              {{ hero ? formatCents(hero.bankroll) : '--' }}
            </p>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-widest text-neutral-500">
              Net P&amp;L
            </p>
            <p
              class="text-xl font-mono"
              :class="sessionStats.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ sessionStats.totalProfitLoss >= 0 ? '+' : '' }}{{ formatCents(sessionStats.totalProfitLoss) }}
            </p>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-widest text-neutral-500">
              Total Wagered
            </p>
            <p class="text-xl font-mono text-neutral-200">
              {{ formatCents(sessionStats.totalWagered) }}
            </p>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-widest text-neutral-500">
              Point Conv. Rate
            </p>
            <p class="text-xl font-mono text-amber-400">
              {{ sessionStats.pointsEstablished > 0
                ? Math.round((sessionStats.pointsMade / sessionStats.pointsEstablished) * 100) + '%'
                : '--' }}
            </p>
          </div>
        </div>

        <!-- Roll Distribution -->
        <div class="rounded-xl bg-neutral-900/80 border border-neutral-800 overflow-hidden">
          <div class="px-5 py-3 border-b border-neutral-800">
            <h2 class="text-sm font-semibold text-neutral-300">
              Roll Distribution
            </h2>
          </div>
          <div class="px-5 py-4 space-y-2">
            <div
              v-for="n in [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]"
              :key="n"
              class="flex items-center gap-3 text-xs"
            >
              <span class="w-6 text-right font-mono text-neutral-400">{{ n }}</span>
              <div class="flex-1 h-4 bg-neutral-800 rounded overflow-hidden relative">
                <div
                  class="h-full rounded transition-all duration-300"
                  :class="n === 7 ? 'bg-red-500/70' : 'bg-emerald-500/50'"
                  :style="{ width: ((rollDistribution[n]! / totalRolls) * 100 * 3.6) + '%' }"
                />
                <!-- Expected line -->
                <div
                  class="absolute top-0 h-full w-px bg-amber-400/50"
                  :style="{ left: ((expectedProbs[n]! / 36) * 100 * 3.6) + '%' }"
                  :title="'Expected: ' + ((expectedProbs[n]! / 36) * 100).toFixed(1) + '%'"
                />
              </div>
              <span class="w-8 text-right font-mono text-neutral-500">{{ rollDistribution[n] }}</span>
              <span class="w-12 text-right font-mono text-neutral-600">
                {{ ((rollDistribution[n]! / totalRolls) * 100).toFixed(1) }}%
              </span>
            </div>
            <p class="text-[10px] text-neutral-600 pt-1">
              Gold line = expected probability. Bar = actual frequency.
            </p>
          </div>
        </div>

        <!-- Bet Type Performance -->
        <div class="rounded-xl bg-neutral-900/80 border border-neutral-800 overflow-hidden">
          <div class="px-5 py-3 border-b border-neutral-800">
            <h2 class="text-sm font-semibold text-neutral-300">
              Bet Performance
            </h2>
          </div>
          <div
            v-if="betTypeEntries.length === 0"
            class="px-5 py-8 text-center text-neutral-600 text-sm"
          >
            No bets placed yet.
          </div>
          <div
            v-else
            class="divide-y divide-neutral-800/50"
          >
            <div class="grid grid-cols-6 gap-2 px-5 py-2 text-[10px] uppercase tracking-widest text-neutral-600">
              <span class="col-span-2">Bet Type</span>
              <span class="text-right">Placed</span>
              <span class="text-right">W / L</span>
              <span class="text-right">Wagered</span>
              <span class="text-right">Net P&amp;L</span>
            </div>
            <div
              v-for="[betType, stats] in betTypeEntries"
              :key="betType"
              class="grid grid-cols-6 gap-2 px-5 py-2 text-sm hover:bg-neutral-800/30"
            >
              <span class="col-span-2 font-mono text-neutral-300 text-xs">{{ betType }}</span>
              <span class="text-right font-mono text-neutral-400">{{ stats.timesPlaced }}</span>
              <span class="text-right font-mono text-neutral-400">{{ stats.won }} / {{ stats.lost }}</span>
              <span class="text-right font-mono text-neutral-400">{{ formatCents(stats.totalWagered) }}</span>
              <span
                class="text-right font-mono"
                :class="stats.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'"
              >
                {{ stats.netProfitLoss >= 0 ? '+' : '' }}{{ formatCents(stats.netProfitLoss) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <div
        v-else
        class="rounded-xl bg-neutral-900/80 border border-neutral-800 px-5 py-12 text-center"
      >
        <p class="text-neutral-500 text-sm">
          No active session. Start a game to see analysis here.
        </p>
      </div>
    </div>
  </div>
</template>
