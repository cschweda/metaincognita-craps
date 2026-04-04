<script setup lang="ts">
import { crapsConfig } from '~~/craps.config'
import { formatCents } from '~/utils/format'

defineProps<{
  level: number
}>()

const emit = defineEmits<{
  'update:level': [value: number]
}>()

const stakes = crapsConfig.stakes
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-amber-400 tracking-wide uppercase">
      Table Stakes
    </h2>

    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <button
        v-for="stake in stakes"
        :key="stake.level"
        class="relative rounded-xl p-4 text-left transition-all duration-200 cursor-pointer border-2"
        :class="[
          level === stake.level
            ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20'
            : 'border-neutral-700 bg-neutral-800/60 hover:border-neutral-500 hover:bg-neutral-800'
        ]"
        @click="emit('update:level', stake.level)"
      >
        <div class="font-bold text-sm mb-2" :class="level === stake.level ? 'text-amber-400' : 'text-neutral-200'">
          {{ stake.name }}
        </div>
        <div class="space-y-1 text-xs text-neutral-400">
          <div>
            <span class="text-neutral-500">Bets:</span>
            {{ formatCents(stake.minBet) }} - {{ formatCents(stake.maxBet) }}
          </div>
          <div>
            <span class="text-neutral-500">Bankroll:</span>
            <span class="text-emerald-400"> {{ formatCents(stake.defaultBankroll) }}</span>
          </div>
          <div>
            <span class="text-neutral-500">Odds:</span>
            {{ stake.oddsMultiple }}
          </div>
        </div>

        <div
          v-if="level === stake.level"
          class="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400"
        />
      </button>
    </div>
  </div>
</template>
