<script setup lang="ts">
const store = useCrapsStore()

// Load session if needed (user navigated directly)
onMounted(() => {
  if (store.phase === 'SETUP') {
    store.loadFromLocalStorage()
  }
})

const hasSession = computed(() => store.phase !== 'SETUP')
const rollHistory = computed(() => store.rollHistory)
const sessionStats = computed(() => store.sessionStats)
</script>

<template>
  <div class="flex-1 bg-neutral-950 overflow-y-auto">
    <div class="max-w-[800px] mx-auto px-4 py-8 space-y-6">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-neutral-200">
          Roll History
        </h1>
        <p class="text-sm text-neutral-500">
          Complete roll-by-roll record of your session.
        </p>
      </div>

      <template v-if="hasSession">
        <!-- Session summary -->
        <div class="rounded-xl bg-neutral-900/80 border border-neutral-800 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p class="text-[10px] uppercase tracking-widest text-neutral-500">
              Total Rolls
            </p>
            <p class="text-xl font-mono text-neutral-200">
              {{ sessionStats.rollsWitnessed }}
            </p>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-widest text-neutral-500">
              Points Made
            </p>
            <p class="text-xl font-mono text-emerald-400">
              {{ sessionStats.pointsMade }}
            </p>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-widest text-neutral-500">
              Points Missed
            </p>
            <p class="text-xl font-mono text-red-400">
              {{ sessionStats.pointsMissed }}
            </p>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-widest text-neutral-500">
              Longest Shooter
            </p>
            <p class="text-xl font-mono text-amber-400">
              {{ sessionStats.longestShooterRolls }}
            </p>
          </div>
        </div>

        <!-- Roll log -->
        <div class="rounded-xl bg-neutral-900/80 border border-neutral-800 overflow-hidden">
          <div class="px-5 py-3 border-b border-neutral-800">
            <h2 class="text-sm font-semibold text-neutral-300">
              Roll Log
            </h2>
          </div>
          <div
            v-if="rollHistory.length === 0"
            class="px-5 py-8 text-center text-neutral-600 text-sm"
          >
            No rolls yet. Start playing to see your history here.
          </div>
          <div
            v-else
            class="divide-y divide-neutral-800/50 max-h-[500px] overflow-y-auto"
          >
            <div
              v-for="(roll, i) in rollHistory"
              :key="i"
              class="flex items-center justify-between px-5 py-2 text-sm hover:bg-neutral-800/30"
            >
              <div class="flex items-center gap-3">
                <span class="text-neutral-600 font-mono text-xs w-8 text-right">#{{ sessionStats.rollsWitnessed - i }}</span>
                <span class="font-mono text-neutral-300">
                  {{ roll.die1 }} + {{ roll.die2 }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="font-mono font-bold"
                  :class="{
                    'text-red-400': roll.total === 7,
                    'text-amber-400': [2, 3, 12].includes(roll.total),
                    'text-emerald-400': [11].includes(roll.total),
                    'text-neutral-300': ![2, 3, 7, 11, 12].includes(roll.total)
                  }"
                >
                  {{ roll.total }}
                </span>
                <span
                  v-if="roll.isHard"
                  class="text-[10px] text-amber-500 font-mono"
                >HARD</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div
        v-else
        class="rounded-xl bg-neutral-900/80 border border-neutral-800 px-5 py-12 text-center"
      >
        <p class="text-neutral-500 text-sm">
          No active session. Start a game to track your history.
        </p>
      </div>
    </div>
  </div>
</template>
