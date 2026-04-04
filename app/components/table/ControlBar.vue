<script setup lang="ts">
import { crapsConfig } from '~~/craps.config'

const store = useCrapsStore()
const { placeBet } = useBetManager()

const props = defineProps<{
  canRoll: boolean
  rollBlockedReason: string
}>()

const emit = defineEmits<{
  roll: []
}>()

function handleRoll() {
  emit('roll')
}

function quickBet(type: 'pass' | 'come' | 'place6' | 'place8' | 'passOdds' | 'dontPassOdds') {
  if (type === 'passOdds' || type === 'dontPassOdds') {
    // Place max odds
    const lineBet = store.activeBets.find(
      b => b.owner === 'hero' && b.type === (type === 'passOdds' ? 'pass' : 'dontPass') && b.status !== 'resolved'
    )
    if (!lineBet || !store.point) return
    const multiples = crapsConfig.oddsMultiples[store.tableRules.oddsMultiple]
    const maxMultiple = multiples?.[store.point] ?? 1
    const maxOdds = lineBet.amount * maxMultiple
    placeBet(type, maxOdds, 'hero')
  } else {
    placeBet(type, store.selectedChipValue, 'hero')
  }
}

const phaseBadge = computed(() => {
  if (store.phase === 'COME_OUT') return { label: 'Come Out', color: 'bg-blue-600' }
  if (store.phase === 'POINT_PHASE') return { label: `Point: ${store.point}`, color: 'bg-amber-600' }
  if (store.phase === 'SEVEN_OUT') return { label: 'Seven Out', color: 'bg-red-600' }
  return { label: store.phase, color: 'bg-neutral-600' }
})

const canPlacePass = computed(() => store.phase === 'COME_OUT' && !store.animating)
const canPlaceCome = computed(() => store.phase === 'POINT_PHASE' && !store.animating)
const canPlacePlace = computed(() => ['COME_OUT', 'POINT_PHASE'].includes(store.phase) && !store.animating)

// Can place odds: must be in point phase, have a line bet, not already have odds
const canPlacePassOdds = computed(() => {
  if (store.phase !== 'POINT_PHASE' || !store.point) return false
  const hasPass = store.activeBets.some(b => b.owner === 'hero' && b.type === 'pass' && b.status !== 'resolved')
  const hasOdds = store.activeBets.some(b => b.owner === 'hero' && b.type === 'passOdds' && b.status !== 'resolved')
  return hasPass && !hasOdds
})

const canPlaceDontPassOdds = computed(() => {
  if (store.phase !== 'POINT_PHASE' || !store.point) return false
  const hasDont = store.activeBets.some(b => b.owner === 'hero' && b.type === 'dontPass' && b.status !== 'resolved')
  const hasOdds = store.activeBets.some(b => b.owner === 'hero' && b.type === 'dontPassOdds' && b.status !== 'resolved')
  return hasDont && !hasOdds
})

const showOddsButton = computed(() => canPlacePassOdds.value || canPlaceDontPassOdds.value)

const rollTooltip = computed(() => {
  if (!props.canRoll) return props.rollBlockedReason
  if (store.phase === 'COME_OUT') return 'Roll to establish a point (7/11 wins, 2/3/12 loses, others set the point)'
  if (store.phase === 'POINT_PHASE') return `Roll to try to hit the point (${store.point}) before a 7`
  return 'Roll the dice'
})
</script>

<template>
  <div class="control-bar flex flex-wrap items-center justify-center gap-3 py-3 px-4">
    <!-- Phase badge -->
    <span
      class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white cursor-default"
      :class="phaseBadge.color"
      :title="store.phase === 'COME_OUT'
        ? 'Come-Out Phase: Place a Pass Line or Don\'t Pass bet, then roll.'
        : store.phase === 'POINT_PHASE'
          ? `Point Phase: Trying to roll ${store.point} before 7. All bet types available.`
          : store.phase === 'SEVEN_OUT'
            ? 'Seven Out! All bets resolved. Dice pass to next shooter.'
            : store.phase"
    >
      {{ phaseBadge.label }}
    </span>

    <!-- Roll button -->
    <UButton
      size="lg"
      :disabled="!props.canRoll"
      icon="i-lucide-dice-5"
      label="Roll Dice"
      :title="rollTooltip"
      class="font-bold tracking-wide"
      :class="props.canRoll ? 'cursor-pointer' : 'cursor-not-allowed'"
      :ui="{
        base: 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white shadow-lg shadow-emerald-600/30 px-6'
      }"
      @click="handleRoll"
    />

    <!-- Quick bet buttons -->
    <div class="flex items-center gap-2">
      <UButton
        size="sm"
        variant="outline"
        label="Pass Line"
        :disabled="!canPlacePass"
        :class="canPlacePass ? 'cursor-pointer' : 'cursor-not-allowed'"
        :title="canPlacePass
          ? 'Quick bet: Place minimum on Pass Line (1.41% edge — best bet on the table)'
          : 'Pass Line bets can only be placed during the Come-Out phase'"
        color="neutral"
        @click="quickBet('pass')"
      />
      <UButton
        size="sm"
        variant="outline"
        label="Come"
        :disabled="!canPlaceCome"
        :class="canPlaceCome ? 'cursor-pointer' : 'cursor-not-allowed'"
        :title="canPlaceCome
          ? 'Quick bet: Place minimum on Come (identical to Pass Line — 1.41% edge)'
          : 'Come bets can only be placed during the Point phase'"
        color="neutral"
        @click="quickBet('come')"
      />
      <UButton
        size="sm"
        variant="outline"
        label="Place 6"
        :disabled="!canPlacePlace"
        :class="canPlacePlace ? 'cursor-pointer' : 'cursor-not-allowed'"
        :title="canPlacePlace
          ? 'Quick bet: Place bet on 6. Pays 7:6 (1.52% edge). Bet in multiples of $6 for clean payouts.'
          : 'Place bets available during Come-Out and Point phases'"
        color="neutral"
        @click="quickBet('place6')"
      />
      <UButton
        size="sm"
        variant="outline"
        label="Place 8"
        :disabled="!canPlacePlace"
        :class="canPlacePlace ? 'cursor-pointer' : 'cursor-not-allowed'"
        :title="canPlacePlace
          ? 'Quick bet: Place bet on 8. Pays 7:6 (1.52% edge). Bet in multiples of $6 for clean payouts.'
          : 'Place bets available during Come-Out and Point phases'"
        color="neutral"
        @click="quickBet('place8')"
      />
      <!-- Max Odds button (appears when you have a line bet and point is set) -->
      <UButton
        v-if="showOddsButton"
        size="sm"
        variant="outline"
        :label="canPlacePassOdds ? 'Max Odds' : 'Lay Odds'"
        class="cursor-pointer border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"
        :title="canPlacePassOdds
          ? 'Place maximum odds behind your Pass Line bet. 0% house edge — the best bet in the casino!'
          : 'Lay maximum odds behind your Don\'t Pass bet. 0% house edge.'"
        color="neutral"
        @click="quickBet(canPlacePassOdds ? 'passOdds' : 'dontPassOdds')"
      />
    </div>

    <!-- Same Bet placeholder -->
    <UButton
      size="sm"
      variant="outline"
      label="Same Bet"
      disabled
      color="neutral"
      class="cursor-not-allowed"
      title="Re-places your previous bet configuration. Coming in Phase 3."
    />
  </div>
</template>
