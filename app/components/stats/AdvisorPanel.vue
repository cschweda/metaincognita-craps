<script setup lang="ts">
import type { BetType } from '~/utils/betTypes'
import { formatCents, formatPercent } from '~/utils/format'

const store = useCrapsStore()
const { getRecommendations, getSessionInsights } = useAdvisor()

const emit = defineEmits<{
  'advisor-bet': [betType: BetType]
}>()

const recommendations = computed(() => getRecommendations())
const insights = computed(() => getSessionInsights())

const activeTab = ref<'advisor' | 'session' | 'bets'>('advisor')

// Per-bet-type stats for the bets tab
const betStatsEntries = computed(() => {
  return Object.entries(store.sessionStats.betTypeStats)
    .filter(([_, stats]) => stats.timesPlaced > 0)
    .sort((a, b) => b[1].totalWagered - a[1].totalWagered)
})

// Roll history summary
const rollDistribution = computed(() => {
  const dist: Record<number, number> = {}
  for (let i = 2; i <= 12; i++) dist[i] = 0
  for (const roll of store.rollHistory) {
    dist[roll.total] = (dist[roll.total] ?? 0) + 1
  }
  return dist
})

function priorityColor(p: string): string {
  switch (p) {
    case 'strong': return 'text-emerald-400'
    case 'good': return 'text-blue-400'
    case 'warning': return 'text-amber-400'
    case 'result-win': return 'text-emerald-300'
    case 'result-lose': return 'text-red-400'
    case 'result-push': return 'text-neutral-400'
    case 'result-point': return 'text-amber-300'
    default: return 'text-neutral-300'
  }
}

function priorityIcon(p: string): string {
  switch (p) {
    case 'strong': return 'i-lucide-star'
    case 'good': return 'i-lucide-thumbs-up'
    case 'warning': return 'i-lucide-alert-triangle'
    case 'result-win': return 'i-lucide-trophy'
    case 'result-lose': return 'i-lucide-x-circle'
    case 'result-push': return 'i-lucide-minus-circle'
    case 'result-point': return 'i-lucide-target'
    default: return 'i-lucide-info'
  }
}

function priorityBorder(p: string): string {
  switch (p) {
    case 'strong': return 'border-emerald-500/40'
    case 'good': return 'border-blue-500/40'
    case 'warning': return 'border-amber-500/40'
    case 'result-win': return 'border-emerald-500/50 bg-emerald-950/30'
    case 'result-lose': return 'border-red-500/50 bg-red-950/30'
    case 'result-push': return 'border-neutral-500/40 bg-neutral-900/30'
    case 'result-point': return 'border-amber-500/50 bg-amber-950/30'
    default: return 'border-neutral-600/40'
  }
}

function betTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    pass: 'Pass Line', dontPass: 'Don\'t Pass', come: 'Come', dontCome: 'Don\'t Come',
    passOdds: 'Pass Odds', dontPassOdds: 'DP Odds', comeOdds: 'Come Odds', dontComeOdds: 'DC Odds',
    place4: 'Place 4', place5: 'Place 5', place6: 'Place 6', place8: 'Place 8', place9: 'Place 9', place10: 'Place 10',
    buy4: 'Buy 4', buy5: 'Buy 5', buy6: 'Buy 6', buy8: 'Buy 8', buy9: 'Buy 9', buy10: 'Buy 10',
    lay4: 'Lay 4', lay5: 'Lay 5', lay6: 'Lay 6', lay8: 'Lay 8', lay9: 'Lay 9', lay10: 'Lay 10',
    field: 'Field', hard4: 'Hard 4', hard6: 'Hard 6', hard8: 'Hard 8', hard10: 'Hard 10',
    any7: 'Any 7', anyCraps: 'Any Craps', aces: 'Aces', boxcars: 'Boxcars',
    aceDeuce: 'Ace-Deuce', yo: 'Yo', crapsEleven: 'C&E', horn: 'Horn',
    big6: 'Big 6', big8: 'Big 8'
  }
  return labels[type] ?? type
}
</script>

<template>
  <div class="stats-panel flex flex-col h-full bg-neutral-900/95 text-sm">
    <!-- Tab headers -->
    <div class="flex border-b border-neutral-700">
      <button
        v-for="tab in [
          { key: 'advisor', label: 'Advisor' },
          { key: 'session', label: 'Session' },
          { key: 'bets', label: 'Bets' }
        ]"
        :key="tab.key"
        class="flex-1 py-2 px-2 text-xs font-medium transition-colors"
        :class="activeTab === tab.key
          ? 'text-emerald-400 border-b-2 border-emerald-400 bg-neutral-800/50'
          : 'text-neutral-500 hover:text-neutral-300'"
        @click="activeTab = tab.key as typeof activeTab"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-y-auto">
      <!-- ADVISOR TAB -->
      <div
        v-if="activeTab === 'advisor'"
        class="p-3 space-y-2"
      >
        <!-- Dice result + phase at top of advisor -->
        <div
          v-if="store.currentRoll"
          class="flex items-center gap-2 bg-neutral-800/80 rounded-lg px-3 py-2"
        >
          <div class="flex items-center gap-1">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-white text-black font-bold text-xs border border-neutral-400">{{ store.currentRoll.die1 }}</span>
            <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-white text-black font-bold text-xs border border-neutral-400">{{ store.currentRoll.die2 }}</span>
          </div>
          <span
            class="font-bold text-sm"
            :class="{
              'text-red-400': store.currentRoll.total === 7 && !store.isComingOut,
              'text-emerald-400': (store.currentRoll.total === 7 || store.currentRoll.total === 11) && store.isComingOut,
              'text-amber-400': store.currentRoll.total === store.point,
              'text-neutral-200': ![7, 11].includes(store.currentRoll.total) && store.currentRoll.total !== store.point
            }"
          >= {{ store.currentRoll.total }}</span>
          <span
            v-if="store.currentRoll.isHard && [4, 6, 8, 10].includes(store.currentRoll.total)"
            class="text-amber-400 text-[10px]"
          >(hard)</span>
          <span class="ml-auto text-neutral-500 text-[10px]">
            {{ store.isComingOut ? 'Come Out' : store.point ? `Point: ${store.point}` : '' }}
          </span>
        </div>
        <div
          v-else-if="store.phase !== 'SETUP'"
          class="bg-neutral-800/60 rounded-lg px-3 py-2 text-center text-neutral-500 text-xs"
        >
          {{ store.isComingOut ? 'Come-Out Roll — place your bets!' : `Point is ${store.point}` }}
        </div>

        <div
          v-if="recommendations.length === 0"
          class="text-neutral-500 text-xs italic py-4 text-center"
        >
          No recommendations right now. Place some bets!
        </div>
        <div
          v-for="(rec, i) in recommendations"
          :key="`${i}-${rec.action}`"
          class="rounded-lg border p-3"
          :class="priorityBorder(rec.priority)"
        >
          <!-- Action headline -->
          <div class="flex items-start gap-2">
            <UIcon
              :name="priorityIcon(rec.priority)"
              class="w-4 h-4 mt-0.5 shrink-0"
              :class="priorityColor(rec.priority)"
            />
            <p
              class="font-semibold text-xs"
              :class="priorityColor(rec.priority)"
            >
              {{ rec.action }}
            </p>
          </div>

          <!-- WHERE to click (highlighted action box — clickable when a bet can be placed) -->
          <button
            v-if="rec.where && rec.betType"
            class="mt-2 w-full text-left px-2.5 py-1.5 rounded border text-xs leading-snug transition-all cursor-pointer bg-emerald-900/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-800/60 hover:border-emerald-400/50 active:scale-[0.98]"
            @click="emit('advisor-bet', rec.betType!)"
          >
            <span class="font-bold">DO THIS →</span> {{ rec.where }}
          </button>
          <div
            v-else-if="rec.where"
            class="mt-2 px-2.5 py-1.5 rounded bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 text-xs leading-snug"
          >
            <span class="font-bold">DO THIS →</span> {{ rec.where }}
          </div>

          <!-- Detail paragraphs -->
          <div
            v-if="rec.detail && rec.detail.length > 0"
            class="mt-2 space-y-1.5"
          >
            <p
              v-for="(para, j) in rec.detail"
              :key="j"
              class="text-xs leading-relaxed"
              :class="{
                'text-emerald-400/80 font-medium': para.startsWith('★'),
                'text-blue-400/80': para.startsWith('✓'),
                'text-neutral-400': para.startsWith('○') || (!para.startsWith('★') && !para.startsWith('✓') && !para.startsWith('⚠') && !para.startsWith('✗')),
                'text-amber-400/80': para.startsWith('⚠'),
                'text-red-400/80': para.startsWith('✗')
              }"
            >
              {{ para }}
            </p>
          </div>

          <!-- House edge badge -->
          <p
            v-if="rec.houseEdge !== undefined"
            class="mt-1.5 text-neutral-500 text-[10px]"
          >
            House edge: {{ rec.houseEdge === 0 ? '0% (true odds — best bet in the casino!)' : formatPercent(rec.houseEdge) }}
          </p>
        </div>
      </div>

      <!-- SESSION TAB -->
      <div
        v-if="activeTab === 'session'"
        class="p-3 space-y-3"
      >
        <!-- Current roll result -->
        <div
          v-if="store.currentRoll"
          class="bg-neutral-800/80 rounded-lg p-3 text-center"
        >
          <div class="text-neutral-500 text-[10px] uppercase tracking-wider mb-1">
            Last Roll
          </div>
          <div class="flex items-center justify-center gap-3">
            <div class="flex items-center gap-1.5">
              <span class="inline-flex items-center justify-center w-8 h-8 rounded bg-white text-black font-bold text-sm border border-neutral-300">
                {{ store.currentRoll.die1 }}
              </span>
              <span class="text-neutral-500 text-xs">+</span>
              <span class="inline-flex items-center justify-center w-8 h-8 rounded bg-white text-black font-bold text-sm border border-neutral-300">
                {{ store.currentRoll.die2 }}
              </span>
              <span class="text-neutral-500 text-xs">=</span>
              <span
                class="inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-lg"
                :class="{
                  'bg-red-600 text-white': store.currentRoll.total === 7 && store.phase !== 'COME_OUT',
                  'bg-emerald-600 text-white': (store.currentRoll.total === 7 || store.currentRoll.total === 11) && store.isComingOut,
                  'bg-amber-500 text-black': store.currentRoll.total === store.point,
                  'bg-neutral-700 text-white': ![7, 11].includes(store.currentRoll.total) && store.currentRoll.total !== store.point
                }"
              >
                {{ store.currentRoll.total }}
              </span>
            </div>
          </div>
          <div
            v-if="store.currentRoll.isHard && [4, 6, 8, 10].includes(store.currentRoll.total)"
            class="text-amber-400 text-[10px] mt-1 font-medium"
          >
            HARD {{ store.currentRoll.total }}
          </div>
          <div class="text-neutral-400 text-[10px] mt-1">
            {{ store.stickmanCall }}
          </div>
        </div>

        <!-- Point indicator -->
        <div
          v-if="store.point"
          class="flex items-center justify-between bg-neutral-800/60 rounded-lg px-3 py-2"
        >
          <span class="text-neutral-400 text-xs">Point</span>
          <div class="flex items-center gap-2">
            <span class="text-amber-400 font-bold text-lg">{{ store.point }}</span>
            <span class="text-neutral-500 text-[10px]">
              {{ { 4: '3 ways (33%)', 5: '4 ways (40%)', 6: '5 ways (45%)', 8: '5 ways (45%)', 9: '4 ways (40%)', 10: '3 ways (33%)' }[store.point] }}
            </span>
          </div>
        </div>

        <!-- Quick stats -->
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-neutral-800/60 rounded-lg p-2">
            <div class="text-neutral-500 text-xs">
              Rolls
            </div>
            <div class="text-neutral-100 font-mono font-bold">
              {{ store.sessionStats.rollsWitnessed }}
            </div>
          </div>
          <div class="bg-neutral-800/60 rounded-lg p-2">
            <div class="text-neutral-500 text-xs">
              P&L
            </div>
            <div
              class="font-mono font-bold"
              :class="store.sessionStats.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ store.sessionStats.totalProfitLoss >= 0 ? '+' : '' }}{{ formatCents(store.sessionStats.totalProfitLoss) }}
            </div>
          </div>
          <div class="bg-neutral-800/60 rounded-lg p-2">
            <div class="text-neutral-500 text-xs">
              Wagered
            </div>
            <div class="text-neutral-100 font-mono">
              {{ formatCents(store.sessionStats.totalWagered) }}
            </div>
          </div>
          <div class="bg-neutral-800/60 rounded-lg p-2">
            <div class="text-neutral-500 text-xs">
              Points
            </div>
            <div class="text-neutral-100 font-mono">
              {{ store.sessionStats.pointsMade }}/{{ store.sessionStats.pointsEstablished }}
            </div>
          </div>
        </div>

        <!-- Roll distribution -->
        <div v-if="store.rollHistory.length > 0">
          <h4 class="text-neutral-400 text-xs font-medium mb-2">
            Roll Distribution
          </h4>
          <div class="flex items-end gap-0.5 h-16">
            <div
              v-for="total in [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]"
              :key="total"
              class="flex-1 flex flex-col items-center"
            >
              <div
                class="w-full rounded-t-sm transition-all"
                :class="total === 7 ? 'bg-red-500/80' : 'bg-emerald-500/60'"
                :style="{
                  height: store.rollHistory.length > 0
                    ? Math.max(2, ((rollDistribution[total] ?? 0) / store.rollHistory.length) * 200) + 'px'
                    : '2px'
                }"
              />
              <span class="text-neutral-500 text-[9px] mt-0.5">{{ total }}</span>
            </div>
          </div>
        </div>

        <!-- Insights -->
        <div v-if="insights.length > 0">
          <h4 class="text-neutral-400 text-xs font-medium mb-2">
            Insights
          </h4>
          <div class="space-y-2">
            <div
              v-for="insight in insights"
              :key="insight"
              class="text-neutral-300 text-xs bg-neutral-800/40 rounded p-2 leading-relaxed"
            >
              {{ insight }}
            </div>
          </div>
        </div>

        <!-- Recent rolls -->
        <div v-if="store.rollHistory.length > 0">
          <h4 class="text-neutral-400 text-xs font-medium mb-2">
            Last 20 Rolls
          </h4>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(roll, i) in store.rollHistory.slice(0, 20)"
              :key="store.rollNumber - i"
              class="inline-flex items-center justify-center w-7 h-6 rounded text-xs font-mono font-bold"
              :class="{
                'bg-red-900/60 text-red-300': roll.total === 7,
                'bg-emerald-900/60 text-emerald-300': roll.total === 11 || (store.point && roll.total === store.point),
                'bg-amber-900/60 text-amber-300': roll.total === 2 || roll.total === 3 || roll.total === 12,
                'bg-neutral-800 text-neutral-300': ![2, 3, 7, 11, 12].includes(roll.total) && roll.total !== store.point
              }"
            >
              {{ roll.total }}
            </span>
          </div>
        </div>
      </div>

      <!-- BETS TAB -->
      <div
        v-if="activeTab === 'bets'"
        class="p-3 space-y-3"
      >
        <!-- Active bets -->
        <div v-if="store.activeBets.filter(b => b.owner === 'hero' && b.status !== 'resolved').length > 0">
          <h4 class="text-neutral-400 text-xs font-medium mb-2">
            Your Active Bets
          </h4>
          <div class="space-y-1">
            <div
              v-for="bet in store.activeBets.filter(b => b.owner === 'hero' && b.status !== 'resolved')"
              :key="bet.id"
              class="flex items-center justify-between bg-neutral-800/60 rounded px-2 py-1.5"
            >
              <div class="flex items-center gap-2">
                <span class="text-neutral-200 text-xs font-medium">{{ betTypeLabel(bet.type) }}</span>
                <span
                  v-if="bet.pointNumber"
                  class="text-neutral-500 text-xs"
                >({{ bet.pointNumber }})</span>
                <span
                  v-if="!bet.isWorking"
                  class="text-[9px] bg-neutral-700 text-neutral-400 px-1 rounded"
                >OFF</span>
              </div>
              <span class="text-neutral-100 font-mono text-xs">{{ formatCents(bet.amount) }}</span>
            </div>
          </div>
        </div>
        <div
          v-else
          class="text-neutral-500 text-xs italic py-2 text-center"
        >
          No active bets
        </div>

        <!-- Bet type performance -->
        <div v-if="betStatsEntries.length > 0">
          <h4 class="text-neutral-400 text-xs font-medium mb-2">
            Performance by Bet Type
          </h4>
          <div class="space-y-1">
            <div
              v-for="[type, stats] in betStatsEntries"
              :key="type"
              class="bg-neutral-800/40 rounded px-2 py-1.5"
            >
              <div class="flex items-center justify-between">
                <span class="text-neutral-300 text-xs">{{ betTypeLabel(type) }}</span>
                <span
                  class="font-mono text-xs"
                  :class="stats.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'"
                >
                  {{ stats.netProfitLoss >= 0 ? '+' : '' }}{{ formatCents(stats.netProfitLoss) }}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-0.5 text-neutral-500 text-[10px]">
                <span>{{ stats.won }}W / {{ stats.lost }}L{{ stats.pushed ? ` / ${stats.pushed}P` : '' }}</span>
                <span>&middot;</span>
                <span>{{ formatCents(stats.totalWagered) }} wagered</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Last resolutions -->
        <div v-if="store.lastResolutions.length > 0">
          <h4 class="text-neutral-400 text-xs font-medium mb-2">
            Last Roll Results
          </h4>
          <div class="space-y-1">
            <div
              v-for="res in store.lastResolutions.filter(r => r.owner === 'hero')"
              :key="res.betId"
              class="flex items-center justify-between text-xs px-2 py-1 rounded"
              :class="{
                'bg-emerald-900/30 text-emerald-300': res.outcome === 'win',
                'bg-red-900/30 text-red-300': res.outcome === 'lose',
                'bg-neutral-800/30 text-neutral-400': res.outcome === 'push'
              }"
            >
              <span>{{ res.description }}</span>
              <span
                v-if="res.outcome === 'win'"
                class="font-mono"
              >+{{ formatCents(res.netGain) }}</span>
              <span
                v-else-if="res.outcome === 'lose'"
                class="font-mono"
              >{{ formatCents(res.netGain) }}</span>
              <span
                v-else
                class="font-mono"
              >Push</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
