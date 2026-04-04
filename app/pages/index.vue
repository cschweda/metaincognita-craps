<script setup lang="ts">
import { crapsConfig } from '~~/craps.config'
import type { TableRules } from '~/utils/betTypes'
import { useCrapsStore } from '~/stores/craps'

const store = useCrapsStore()
const router = useRouter()

// State
const heroName = ref('Hero')
const stakeLevel = ref(crapsConfig.defaultStakeLevel)
const selectedStake = computed(() => crapsConfig.stakes[stakeLevel.value - 1]!)
const bankroll = ref(selectedStake.value.defaultBankroll)
const tableRules = ref<Partial<TableRules>>({})
const bots = ref<Array<{ name: string; strategy: string }>>([])

// Initialize default bots
const defaultBots = crapsConfig.botStrategies.slice(0, 3).map(s => ({
  name: s.name,
  strategy: s.system
}))
bots.value = defaultBots

// When stake level changes, reset bankroll to new default
watch(stakeLevel, () => {
  bankroll.value = selectedStake.value.defaultBankroll
  // Update odds multiple to match stake default
  tableRules.value = {
    ...tableRules.value,
    oddsMultiple: selectedStake.value.oddsMultiple
  }
})

// Validation
const nameError = computed(() => !heroName.value.trim() ? 'Name is required' : '')
const bankrollError = computed(() => bankroll.value <= 0 ? 'Bankroll must be positive' : '')
const canStart = computed(() => heroName.value.trim().length > 0 && bankroll.value > 0)

function startGame() {
  if (!canStart.value) return

  store.initializeGame({
    heroName: heroName.value.trim(),
    bankroll: bankroll.value,
    stakeLevel: stakeLevel.value,
    tableRules: {
      oddsMultiple: tableRules.value.oddsMultiple ?? selectedStake.value.oddsMultiple,
      ...tableRules.value
    },
    bots: bots.value
  })

  router.push('/table')
}
</script>

<template>
  <div class="min-h-screen bg-neutral-950 flex items-start justify-center px-4 py-10">
    <div class="w-full max-w-[800px] space-y-8">
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-4xl font-bold tracking-tight">
          <span class="text-amber-400">Craps</span>
          <span class="text-neutral-300"> Simulator</span>
        </h1>
        <p class="text-neutral-500 text-sm">
          Set up your table, pick your stakes, and let it ride.
        </p>
      </div>

      <!-- Main card -->
      <div class="rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-2xl shadow-black/40 p-6 sm:p-8 space-y-8">
        <!-- Hero Config -->
        <SetupHeroConfig
          v-model:name="heroName"
          v-model:bankroll="bankroll"
          :default-bankroll="selectedStake.defaultBankroll"
        />

        <div class="border-t border-neutral-800" />

        <!-- Stake Selector -->
        <SetupStakeSelector
          v-model:level="stakeLevel"
        />

        <div class="border-t border-neutral-800" />

        <!-- Table Rules (collapsible) -->
        <SetupTableRules
          v-model:rules="tableRules"
        />

        <div class="border-t border-neutral-800" />

        <!-- Bot Configurator -->
        <SetupBotConfigurator
          v-model:bots="bots"
        />

        <div class="border-t border-neutral-800" />

        <!-- Validation hints -->
        <div v-if="nameError || bankrollError" class="space-y-1">
          <p v-if="nameError" class="text-red-400 text-sm">{{ nameError }}</p>
          <p v-if="bankrollError" class="text-red-400 text-sm">{{ bankrollError }}</p>
        </div>

        <!-- Start Button -->
        <UButton
          size="xl"
          block
          :disabled="!canStart"
          icon="i-lucide-dice-5"
          label="Start Game"
          class="font-bold tracking-wide"
          :ui="{
            base: 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 text-white shadow-lg shadow-emerald-600/30'
          }"
          @click="startGame"
        />
      </div>

      <!-- Footer note -->
      <p class="text-center text-neutral-600 text-xs">
        All amounts are for simulation purposes only. No real money is involved.
      </p>
    </div>
  </div>
</template>
