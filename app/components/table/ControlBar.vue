<script setup lang="ts">
import { listOddsRoom } from '~/engine/betting'

const store = useCrapsStore()
const { placeBet } = useBetManager()

const props = defineProps<{
  canRoll: boolean
  rollBlockedReason: string
  takeDownMode: boolean
  hasSameBet: boolean
  heroIsShooting: boolean
  numberBetMode: 'place' | 'buy' | 'lay'
}>()

const _emit = defineEmits<{
  'roll': []
  'toggle-take-down': []
  'same-bet': []
  'update:number-bet-mode': [mode: 'place' | 'buy' | 'lay']
}>()

type OddsType = 'passOdds' | 'dontPassOdds' | 'comeOdds' | 'dontComeOdds'

/**
 * The best odds bet open to the hero right now: line odds first, then odds
 * behind any established Come / Don't Come bet. Sized to fill the spot to the
 * table limit, or as close as the bankroll allows.
 */
const oddsOffer = computed(() => {
  const bankroll = store.hero?.bankroll ?? 0
  const labels: Record<OddsType, string> = {
    passOdds: 'Max Odds', dontPassOdds: 'Lay Odds', comeOdds: 'Come Odds', dontComeOdds: 'DC Odds'
  }
  for (const type of Object.keys(labels) as OddsType[]) {
    for (const room of listOddsRoom(type, 'hero', store.activeBets, store.point, store.tableRules.oddsMultiple)) {
      const amount = Math.floor(Math.min(room.remaining, bankroll) / 100) * 100
      if (amount < 100) continue
      const isLine = type === 'passOdds' || type === 'dontPassOdds'
      return {
        type,
        amount,
        point: room.point,
        label: isLine ? labels[type] : `${labels[type]} ${room.point}`
      }
    }
  }
  return null
})

function placeOdds() {
  const offer = oddsOffer.value
  if (offer) placeBet(offer.type, offer.amount, 'hero', offer.point)
}

function quickBet(type: 'pass' | 'come' | 'place6' | 'place8') {
  placeBet(type, store.selectedChipValue, 'hero')
}

const numberModes = [
  { key: 'place', label: 'Place', title: 'Number boxes take Place bets — pays 9:5, 7:5 or 7:6' },
  { key: 'buy', label: 'Buy', title: 'Number boxes take Buy bets — true odds, 5% vig' },
  { key: 'lay', label: 'Lay', title: 'Number boxes take Lay bets — betting a 7 comes first; 5% vig on the win' }
] as const

const phaseBadge = computed(() => {
  if (store.phase === 'COME_OUT') return { label: 'Come Out', color: 'bg-blue-600' }
  if (store.phase === 'POINT_PHASE') return { label: `Point: ${store.point}`, color: 'bg-amber-600' }
  if (store.phase === 'SEVEN_OUT') return { label: 'Seven Out', color: 'bg-red-600' }
  return { label: store.phase, color: 'bg-neutral-600' }
})

const canPlacePass = computed(() => store.phase === 'COME_OUT')
const canPlaceCome = computed(() => store.phase === 'POINT_PHASE')
const canPlacePlace = computed(() => ['COME_OUT', 'POINT_PHASE'].includes(store.phase))

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
        size="xs"
        variant="outline"
        label="Pass"
        :disabled="!canPlacePass"
        :class="canPlacePass ? 'cursor-pointer' : 'cursor-not-allowed'"
        :title="canPlacePass ? 'Place minimum on Pass Line (1.41% edge)' : 'Only during Come-Out phase'"
        color="neutral"
        @click="quickBet('pass')"
      />
      <UButton
        size="xs"
        variant="outline"
        label="Come"
        :disabled="!canPlaceCome"
        :class="canPlaceCome ? 'cursor-pointer' : 'cursor-not-allowed'"
        :title="canPlaceCome ? 'Place minimum on Come (1.41% edge)' : 'Only during Point phase'"
        color="neutral"
        @click="quickBet('come')"
      />
      <UButton
        size="xs"
        variant="outline"
        label="Pl 6"
        :disabled="!canPlacePlace"
        :class="canPlacePlace ? 'cursor-pointer' : 'cursor-not-allowed'"
        title="Place 6 — pays 7:6 (1.52% edge)"
        color="neutral"
        @click="quickBet('place6')"
      />
      <UButton
        size="xs"
        variant="outline"
        label="Pl 8"
        :disabled="!canPlacePlace"
        :class="canPlacePlace ? 'cursor-pointer' : 'cursor-not-allowed'"
        title="Place 8 — pays 7:6 (1.52% edge)"
        color="neutral"
        @click="quickBet('place8')"
      />
      <UButton
        v-if="oddsOffer"
        size="xs"
        variant="outline"
        :label="oddsOffer.label"
        class="cursor-pointer border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/20"
        :title="`Put ${formatCents(oddsOffer.amount)} in odds behind your bet — 0% house edge`"
        color="neutral"
        @click="placeOdds"
      />
    </div>

    <!-- What a click on a number box places -->
    <div
      class="flex items-center rounded-md border border-neutral-700 overflow-hidden"
      role="group"
      aria-label="Bet type for the number boxes"
    >
      <button
        v-for="mode in numberModes"
        :key="mode.key"
        type="button"
        class="px-2 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"
        :class="props.numberBetMode === mode.key
          ? 'bg-amber-500/20 text-amber-300'
          : 'text-neutral-400 hover:text-neutral-200'"
        :aria-pressed="props.numberBetMode === mode.key"
        :title="mode.title"
        @click="$emit('update:number-bet-mode', mode.key)"
      >
        {{ mode.label }}
      </button>
    </div>

    <!-- Same Bet -->
    <UButton
      size="xs"
      variant="outline"
      label="Same Bet"
      :disabled="!props.hasSameBet"
      :class="props.hasSameBet ? 'cursor-pointer' : 'cursor-not-allowed'"
      :title="props.hasSameBet ? 'Re-place your previous bet configuration' : 'Roll at least once first'"
      color="neutral"
      @click="$emit('same-bet')"
    />

    <!-- Take Down toggle -->
    <UButton
      size="xs"
      variant="outline"
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
