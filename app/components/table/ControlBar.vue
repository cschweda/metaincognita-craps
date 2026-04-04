<script setup lang="ts">
import { crapsConfig } from '~~/craps.config'

const store = useCrapsStore()
const { placeBet } = useBetManager()

const props = defineProps<{
  canRoll: boolean
  rollBlockedReason: string
  takeDownMode: boolean
  hasSameBet: boolean
  heroIsShooting: boolean
}>()

const emit = defineEmits<{
  roll: []
  'toggle-take-down': []
  'same-bet': []
}>()

function quickBet(type: 'pass' | 'come' | 'place6' | 'place8' | 'passOdds' | 'dontPassOdds') {
  if (type === 'passOdds' || type === 'dontPassOdds') {
    const lineType = type === 'passOdds' ? 'pass' : 'dontPass'
    const lineBet = store.activeBets.find(
      b => b.owner === 'hero' && b.type === lineType && b.status !== 'resolved'
    )
    if (!lineBet || !store.point) return
    const multiples = crapsConfig.oddsMultiples[store.tableRules.oddsMultiple]
    const maxMultiple = multiples?.[store.point] ?? 1
    placeBet(type, lineBet.amount * maxMultiple, 'hero')
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

const rollLabel = computed(() => props.heroIsShooting ? 'Shoot' : 'Roll')

const rollTooltip = computed(() => {
  if (!props.canRoll) return props.rollBlockedReason
  if (store.phase === 'COME_OUT') return 'Roll to establish a point (7/11 wins, 2/3/12 loses, others set the point). Shortcut: Spacebar'
  if (store.phase === 'POINT_PHASE') return `Roll to try to hit the point (${store.point}) before a 7. Shortcut: Spacebar`
  return 'Roll the dice (Spacebar)'
})
</script>

<template>
  <div class="control-bar flex flex-wrap items-center justify-center gap-2 py-2.5 px-4">
    <!-- Phase badge -->
    <span
      class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white cursor-default"
      :class="phaseBadge.color"
      :title="store.phase === 'COME_OUT'
        ? 'Come-Out Phase: Place a Pass Line or Don\'t Pass bet, then roll.'
        : store.phase === 'POINT_PHASE'
          ? `Point Phase: Trying to roll ${store.point} before 7. All bet types available.`
          : 'Seven Out! Dice pass to next shooter.'"
    >
      {{ phaseBadge.label }}
    </span>

    <!-- Roll/Shoot button -->
    <UButton
      size="lg"
      :disabled="!props.canRoll"
      icon="i-lucide-dice-5"
      :label="rollLabel"
      :title="rollTooltip"
      class="font-bold tracking-wide"
      :class="props.canRoll ? 'cursor-pointer' : 'cursor-not-allowed'"
      :ui="{ base: 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white shadow-lg shadow-emerald-600/30 px-6' }"
      @click="$emit('roll')"
    />

    <!-- Quick bet buttons -->
    <div class="flex items-center gap-1.5">
      <UButton
        size="xs" variant="outline" label="Pass"
        :disabled="!canPlacePass"
        :class="canPlacePass ? 'cursor-pointer' : 'cursor-not-allowed'"
        :title="canPlacePass ? 'Place minimum on Pass Line (1.41% edge)' : 'Only during Come-Out phase'"
        color="neutral" @click="quickBet('pass')"
      />
      <UButton
        size="xs" variant="outline" label="Come"
        :disabled="!canPlaceCome"
        :class="canPlaceCome ? 'cursor-pointer' : 'cursor-not-allowed'"
        :title="canPlaceCome ? 'Place minimum on Come (1.41% edge)' : 'Only during Point phase'"
        color="neutral" @click="quickBet('come')"
      />
      <UButton
        size="xs" variant="outline" label="Pl 6"
        :disabled="!canPlacePlace"
        :class="canPlacePlace ? 'cursor-pointer' : 'cursor-not-allowed'"
        title="Place 6 — pays 7:6 (1.52% edge)"
        color="neutral" @click="quickBet('place6')"
      />
      <UButton
        size="xs" variant="outline" label="Pl 8"
        :disabled="!canPlacePlace"
        :class="canPlacePlace ? 'cursor-pointer' : 'cursor-not-allowed'"
        title="Place 8 — pays 7:6 (1.52% edge)"
        color="neutral" @click="quickBet('place8')"
      />
      <UButton
        v-if="showOddsButton"
        size="xs" variant="outline"
        :label="canPlacePassOdds ? 'Max Odds' : 'Lay Odds'"
        class="cursor-pointer border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/20"
        :title="'Place max odds — 0% house edge!'"
        color="neutral"
        @click="quickBet(canPlacePassOdds ? 'passOdds' : 'dontPassOdds')"
      />
    </div>

    <!-- Same Bet -->
    <UButton
      size="xs" variant="outline"
      label="Same Bet"
      :disabled="!props.hasSameBet"
      :class="props.hasSameBet ? 'cursor-pointer' : 'cursor-not-allowed'"
      :title="props.hasSameBet ? 'Re-place your previous bet configuration' : 'Roll at least once first'"
      color="neutral"
      @click="$emit('same-bet')"
    />

    <!-- Take Down toggle -->
    <UButton
      size="xs" variant="outline"
      :label="props.takeDownMode ? 'Done' : 'Take Down'"
      :class="props.takeDownMode ? 'border-red-500 text-red-400 bg-red-500/10' : 'cursor-pointer'"
      :title="props.takeDownMode
        ? 'Exit take-down mode'
        : 'Enter take-down mode: click any removable bet to remove it'"
      color="neutral"
      @click="$emit('toggle-take-down')"
    />
  </div>
</template>
