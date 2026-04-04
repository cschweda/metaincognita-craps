<script setup lang="ts">
import type { TableRules } from '~/utils/betTypes'

const props = defineProps<{
  rules: Partial<TableRules>
}>()

const emit = defineEmits<{
  'update:rules': [value: Partial<TableRules>]
}>()

const open = ref(false)

function update(patch: Partial<TableRules>) {
  emit('update:rules', { ...props.rules, ...patch })
}

const oddsOptions = [
  { label: '1x', value: '1x' },
  { label: '2x', value: '2x' },
  { label: '3-4-5x', value: '3-4-5x' },
  { label: '5x', value: '5x' },
  { label: '10x', value: '10x' },
  { label: '20x', value: '20x' },
  { label: '100x', value: '100x' }
]

const fieldPayoutItems = [
  { label: 'Double (2:1)', value: 2 },
  { label: 'Triple (3:1)', value: 3 }
]

const buyVigItems = [
  { label: 'Charged on every buy', value: 'on_bet' },
  { label: 'Charged on wins only', value: 'on_win' }
]

const roundingOptions = [
  { label: 'Round down to dollar', value: 'dollar' },
  { label: 'Round down to $0.25', value: 'quarter' },
  { label: 'Exact (to the penny)', value: 'exact' }
]
</script>

<template>
  <div class="space-y-3">
    <button
      class="flex items-center gap-2 text-lg font-semibold text-amber-400 tracking-wide uppercase cursor-pointer group"
      @click="open = !open"
    >
      <UIcon
        :name="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        class="text-amber-500 transition-transform"
      />
      Table Rules
      <span class="text-xs text-neutral-500 font-normal normal-case">(optional)</span>
    </button>

    <div v-show="open" class="space-y-5 pl-1 pt-2">
      <!-- Odds Multiple -->
      <UFormField label="Odds Multiple">
        <USelect
          :model-value="rules.oddsMultiple ?? '3-4-5x'"
          :items="oddsOptions"
          class="w-48"
          @update:model-value="update({ oddsMultiple: $event as string })"
        />
      </UFormField>

      <!-- Field 12 Payout -->
      <UFormField label="Field 12 Payout">
        <URadioGroup
          :model-value="rules.fieldTwelvePayout ?? 3"
          :items="fieldPayoutItems"
          orientation="horizontal"
          @update:model-value="update({ fieldTwelvePayout: $event as 2 | 3 })"
        />
      </UFormField>

      <!-- Buy Bet Vig -->
      <UFormField label="Buy Bet Vig">
        <URadioGroup
          :model-value="rules.buyVigTiming ?? 'on_win'"
          :items="buyVigItems"
          orientation="horizontal"
          @update:model-value="update({ buyVigTiming: $event as 'on_bet' | 'on_win' })"
        />
      </UFormField>

      <!-- Hardways on Come-out -->
      <div class="flex items-center gap-3">
        <USwitch
          :model-value="rules.hardwaysOnComeOut ?? false"
          @update:model-value="update({ hardwaysOnComeOut: $event })"
        />
        <span class="text-sm text-neutral-300">Hardways working on come-out roll</span>
      </div>

      <!-- Payout Rounding -->
      <UFormField label="Payout Rounding">
        <USelect
          :model-value="rules.payoutRounding ?? 'dollar'"
          :items="roundingOptions"
          class="w-64"
          @update:model-value="update({ payoutRounding: $event as 'dollar' | 'quarter' | 'exact' })"
        />
      </UFormField>
    </div>
  </div>
</template>
