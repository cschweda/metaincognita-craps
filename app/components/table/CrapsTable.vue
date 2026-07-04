<script setup lang="ts">
import type { ActiveBet } from '~/utils/betTypes'
import { BET_TYPE_TO_ZONE } from '~/utils/betTypes'
import { zoneDescriptions } from '~/utils/zoneDescriptions'

interface Props {
  activeBets?: ActiveBet[]
  disabledZones?: Set<string>
  puckState?: 'ON' | 'OFF'
  puckPoint?: number | null
  studyMode?: boolean
  gamePhase?: string
}

const props = withDefaults(defineProps<Props>(), {
  activeBets: () => [],
  disabledZones: () => new Set<string>(),
  puckState: 'OFF',
  puckPoint: null,
  studyMode: false,
  gamePhase: 'SETUP'
})

const emit = defineEmits<{
  'zone-click': [zoneId: string]
}>()

function isDisabled(zoneId: string): boolean {
  return props.disabledZones.has(zoneId)
}

function handleZoneClick(zoneId: string) {
  if (props.studyMode) return
  if (!isDisabled(zoneId)) {
    emit('zone-click', zoneId)
  }
}

// ── Study mode hover state ──
const studyHoveredZone = ref<string | null>(null)
const studyTooltipPos = ref({ x: 0, y: 0 })

/** Delegated mouse handler — finds closest zone <g> and extracts its id */
function handleStudyMouseMove(event: MouseEvent) {
  if (!props.studyMode) {
    if (studyHoveredZone.value) studyHoveredZone.value = null
    return
  }
  const target = event.target as Element
  const zoneEl = target?.closest?.('.zone')
  const zoneId = zoneEl?.id || null
  if (zoneId && zoneDescriptions[zoneId]) {
    studyHoveredZone.value = zoneId
    const svg = target.closest('svg')
    if (svg) {
      const rect = svg.getBoundingClientRect()
      studyTooltipPos.value = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
    }
  } else {
    studyHoveredZone.value = null
  }
}

function handleStudyMouseLeave() {
  studyHoveredZone.value = null
}

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

function zoneAriaLabel(zoneId: string): string {
  const name = zoneDescriptions[zoneId]?.name ?? zoneId
  const total = zoneBetTotal(zoneId)
  return total > 0 ? `${name}, ${formatChipAmount(total)} bet placed` : name
}

/** Delegated keyboard activation for betting zones (Enter / Space). */
function handleZoneKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  if (event.repeat) return
  const zoneEl = (event.target as Element)?.closest?.('.zone')
  if (!zoneEl?.id) return
  event.preventDefault()
  event.stopPropagation()
  handleZoneClick(zoneEl.id)
}

/** Puck x position based on point number */
const puckPositions: Record<number, number> = {
  4: 155,
  5: 255,
  6: 355,
  8: 455,
  9: 555,
  10: 655
}

const puckX = computed(() => {
  if (props.puckState === 'ON' && props.puckPoint) {
    return puckPositions[props.puckPoint] ?? 155
  }
  // OFF position: in Don't Come area
  return 420
})

const puckY = computed(() => {
  if (props.puckState === 'ON' && props.puckPoint) {
    return 68 // center of number box row
  }
  return 155 // Don't Come area
})
</script>

<template>
  <div class="relative">
    <svg
      viewBox="-20 -20 1240 640"
      xmlns="http://www.w3.org/2000/svg"
      class="craps-table w-full h-auto select-none"
      :class="{ 'study-mode': studyMode }"
      role="group"
      :aria-label="'Craps table'"
      @mousemove="handleStudyMouseMove"
      @mouseleave="handleStudyMouseLeave"
      @keydown="handleZoneKeydown"
      @mousedown.prevent
    >
      <defs>
        <!-- Slight transparency fill for zone interactivity -->
        <linearGradient
          id="felt-sheen"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stop-color="rgba(255,255,255,0.04)"
          />
          <stop
            offset="100%"
            stop-color="rgba(0,0,0,0.06)"
          />
        </linearGradient>
      </defs>

      <!-- ==================== FELT BACKGROUND ==================== -->
      <rect
        x="0"
        y="0"
        width="1200"
        height="600"
        fill="#006633"
        rx="30"
        ry="30"
      />
      <!-- Table border -->
      <rect
        x="4"
        y="4"
        width="1192"
        height="592"
        fill="none"
        stroke="#8B6914"
        stroke-width="6"
        rx="28"
        ry="28"
      />
      <!-- Inner rail -->
      <rect
        x="14"
        y="14"
        width="1172"
        height="572"
        fill="none"
        stroke="#8B6914"
        stroke-width="2"
        rx="22"
        ry="22"
      />
      <!-- Felt sheen overlay -->
      <rect
        x="14"
        y="14"
        width="1172"
        height="572"
        fill="url(#felt-sheen)"
        rx="22"
        ry="22"
      />

      <!-- ==================== NUMBER BOXES (top row) ==================== -->
      <g id="number-boxes">
        <!-- Place 4 -->
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
          <rect
            x="105"
            y="30"
            width="100"
            height="80"
            rx="3"
            class="zone-fill"
          />
          <text
            x="155"
            y="58"
            class="label-number"
          >4</text>
          <text
            x="155"
            y="98"
            class="label-payout"
          >9 to 5</text>
        </g>

        <!-- Place 5 -->
        <g
          id="place-5"
          class="zone"
          :class="{ disabled: isDisabled('place-5') }"
          role="button"
          :tabindex="isDisabled('place-5') ? -1 : 0"
          :aria-label="zoneAriaLabel('place-5')"
          :aria-disabled="isDisabled('place-5') || undefined"
          @click="handleZoneClick('place-5')"
        >
          <rect
            x="205"
            y="30"
            width="100"
            height="80"
            rx="3"
            class="zone-fill"
          />
          <text
            x="255"
            y="58"
            class="label-number"
          >5</text>
          <text
            x="255"
            y="98"
            class="label-payout"
          >7 to 5</text>
        </g>

        <!-- Place SIX -->
        <g
          id="place-six"
          class="zone"
          :class="{ disabled: isDisabled('place-six') }"
          role="button"
          :tabindex="isDisabled('place-six') ? -1 : 0"
          :aria-label="zoneAriaLabel('place-six')"
          :aria-disabled="isDisabled('place-six') || undefined"
          @click="handleZoneClick('place-six')"
        >
          <rect
            x="305"
            y="30"
            width="100"
            height="80"
            rx="3"
            class="zone-fill"
          />
          <text
            x="355"
            y="58"
            class="label-number"
          >SIX</text>
          <text
            x="355"
            y="98"
            class="label-payout"
          >7 to 6</text>
        </g>

        <!-- Place 8 -->
        <g
          id="place-8"
          class="zone"
          :class="{ disabled: isDisabled('place-8') }"
          role="button"
          :tabindex="isDisabled('place-8') ? -1 : 0"
          :aria-label="zoneAriaLabel('place-8')"
          :aria-disabled="isDisabled('place-8') || undefined"
          @click="handleZoneClick('place-8')"
        >
          <rect
            x="405"
            y="30"
            width="100"
            height="80"
            rx="3"
            class="zone-fill"
          />
          <text
            x="455"
            y="58"
            class="label-number"
          >8</text>
          <text
            x="455"
            y="98"
            class="label-payout"
          >7 to 6</text>
        </g>

        <!-- Place NINE -->
        <g
          id="place-nine"
          class="zone"
          :class="{ disabled: isDisabled('place-nine') }"
          role="button"
          :tabindex="isDisabled('place-nine') ? -1 : 0"
          :aria-label="zoneAriaLabel('place-nine')"
          :aria-disabled="isDisabled('place-nine') || undefined"
          @click="handleZoneClick('place-nine')"
        >
          <rect
            x="505"
            y="30"
            width="100"
            height="80"
            rx="3"
            class="zone-fill"
          />
          <text
            x="555"
            y="58"
            class="label-number"
          >NINE</text>
          <text
            x="555"
            y="98"
            class="label-payout"
          >7 to 5</text>
        </g>

        <!-- Place 10 -->
        <g
          id="place-10"
          class="zone"
          :class="{ disabled: isDisabled('place-10') }"
          role="button"
          :tabindex="isDisabled('place-10') ? -1 : 0"
          :aria-label="zoneAriaLabel('place-10')"
          :aria-disabled="isDisabled('place-10') || undefined"
          @click="handleZoneClick('place-10')"
        >
          <rect
            x="605"
            y="30"
            width="100"
            height="80"
            rx="3"
            class="zone-fill"
          />
          <text
            x="655"
            y="58"
            class="label-number"
          >10</text>
          <text
            x="655"
            y="98"
            class="label-payout"
          >9 to 5</text>
        </g>
      </g>

      <!-- ==================== BIG 6 / BIG 8 ==================== -->
      <g id="big-bets">
        <g
          id="big-6"
          class="zone"
          :class="{ disabled: isDisabled('big-6') }"
          role="button"
          :tabindex="isDisabled('big-6') ? -1 : 0"
          :aria-label="zoneAriaLabel('big-6')"
          :aria-disabled="isDisabled('big-6') || undefined"
          @click="handleZoneClick('big-6')"
        >
          <rect
            x="30"
            y="30"
            width="75"
            height="40"
            rx="3"
            class="zone-fill"
          />
          <text
            x="67"
            y="56"
            class="label-big"
          >BIG 6</text>
        </g>
        <g
          id="big-8"
          class="zone"
          :class="{ disabled: isDisabled('big-8') }"
          role="button"
          :tabindex="isDisabled('big-8') ? -1 : 0"
          :aria-label="zoneAriaLabel('big-8')"
          :aria-disabled="isDisabled('big-8') || undefined"
          @click="handleZoneClick('big-8')"
        >
          <rect
            x="30"
            y="70"
            width="75"
            height="40"
            rx="3"
            class="zone-fill"
          />
          <text
            x="67"
            y="96"
            class="label-big"
          >BIG 8</text>
        </g>
      </g>

      <!-- ==================== DON'T COME BAR ==================== -->
      <g
        id="dont-come"
        class="zone"
        :class="{ disabled: isDisabled('dont-come') }"
        role="button"
        :tabindex="isDisabled('dont-come') ? -1 : 0"
        :aria-label="zoneAriaLabel('dont-come')"
        :aria-disabled="isDisabled('dont-come') || undefined"
        @click="handleZoneClick('dont-come')"
      >
        <rect
          x="105"
          y="115"
          width="600"
          height="35"
          rx="3"
          class="zone-fill"
        />
        <text
          x="405"
          y="138"
          class="label-main"
        >DON'T COME BAR</text>
      </g>

      <!-- ==================== COME ==================== -->
      <g
        id="come"
        class="zone"
        :class="{ disabled: isDisabled('come') }"
        role="button"
        :tabindex="isDisabled('come') ? -1 : 0"
        :aria-label="zoneAriaLabel('come')"
        :aria-disabled="isDisabled('come') || undefined"
        @click="handleZoneClick('come')"
      >
        <rect
          x="105"
          y="155"
          width="600"
          height="90"
          rx="3"
          class="zone-fill"
        />
        <text
          x="405"
          y="210"
          class="label-large"
        >COME</text>
      </g>

      <!-- ==================== FIELD ==================== -->
      <g
        id="field"
        class="zone"
        :class="{ disabled: isDisabled('field') }"
        role="button"
        :tabindex="isDisabled('field') ? -1 : 0"
        :aria-label="zoneAriaLabel('field')"
        :aria-disabled="isDisabled('field') || undefined"
        @click="handleZoneClick('field')"
      >
        <rect
          x="105"
          y="250"
          width="600"
          height="65"
          rx="3"
          class="zone-fill"
        />
        <text
          x="135"
          y="290"
          class="label-field-title"
        >FIELD</text>
        <!-- Field numbers -->
        <text
          x="230"
          y="283"
          class="label-field-bonus"
        >2</text>
        <text
          x="275"
          y="290"
          class="label-field-num"
        >&bull; 3 &bull; 4 &bull; 9 &bull; 10 &bull; 11 &bull;</text>
        <text
          x="530"
          y="283"
          class="label-field-bonus"
        >12</text>
        <!-- Payout callouts -->
        <text
          x="230"
          y="305"
          class="label-field-pay"
        >pays 2 to 1</text>
        <text
          x="530"
          y="305"
          class="label-field-pay"
        >pays 3 to 1</text>
      </g>

      <!-- ==================== DON'T PASS BAR ==================== -->
      <g
        id="dont-pass"
        class="zone"
        :class="{ disabled: isDisabled('dont-pass') }"
        role="button"
        :tabindex="isDisabled('dont-pass') ? -1 : 0"
        :aria-label="zoneAriaLabel('dont-pass')"
        :aria-disabled="isDisabled('dont-pass') || undefined"
        @click="handleZoneClick('dont-pass')"
      >
        <rect
          x="105"
          y="320"
          width="600"
          height="35"
          rx="3"
          class="zone-fill"
        />
        <text
          x="405"
          y="343"
          class="label-main"
        >DON'T PASS BAR</text>
        <text
          x="580"
          y="343"
          class="label-dp-twelve"
        >&#9323;</text>
      </g>

      <!-- ==================== PASS LINE (L-shaped) ==================== -->
      <g
        id="pass-line"
        class="zone"
        :class="{ disabled: isDisabled('pass-line') }"
        role="button"
        :tabindex="isDisabled('pass-line') ? -1 : 0"
        :aria-label="zoneAriaLabel('pass-line')"
        :aria-disabled="isDisabled('pass-line') || undefined"
        @click="handleZoneClick('pass-line')"
      >
        <!-- Bottom horizontal strip -->
        <path
          d="M 30,360 L 705,360 L 705,570 L 30,570 Z"
          rx="3"
          class="zone-fill"
        />
        <!-- Pass line label (centered in bottom area) -->
        <text
          x="370"
          y="490"
          class="label-pass"
        >PASS LINE</text>
      </g>

      <!-- ==================== PASS ODDS (behind pass line bet) ==================== -->
      <g
        id="pass-odds"
        class="zone"
        :class="{ 'disabled': isDisabled('pass-odds'), 'odds-available': !isDisabled('pass-odds') && zoneBetTotal('pass-odds') === 0 }"
        role="button"
        :tabindex="isDisabled('pass-odds') ? -1 : 0"
        :aria-label="zoneAriaLabel('pass-odds')"
        :aria-disabled="isDisabled('pass-odds') || undefined"
        @click="handleZoneClick('pass-odds')"
      >
        <rect
          x="200"
          y="370"
          width="340"
          height="55"
          rx="5"
          class="zone-fill-odds-area"
        />
        <text
          v-if="zoneBetTotal('pass-odds') === 0 && !isDisabled('pass-odds')"
          x="370"
          y="402"
          class="label-odds-hint"
        >ODDS — click to place (0% edge!)</text>
      </g>

      <!-- ==================== DON'T PASS ODDS ==================== -->
      <g
        id="dont-pass-odds"
        class="zone"
        :class="{ 'disabled': isDisabled('dont-pass-odds'), 'odds-available': !isDisabled('dont-pass-odds') && zoneBetTotal('dont-pass-odds') === 0 }"
        role="button"
        :tabindex="isDisabled('dont-pass-odds') ? -1 : 0"
        :aria-label="zoneAriaLabel('dont-pass-odds')"
        :aria-disabled="isDisabled('dont-pass-odds') || undefined"
        @click="handleZoneClick('dont-pass-odds')"
      >
        <rect
          x="200"
          y="320"
          width="200"
          height="35"
          rx="3"
          class="zone-fill-odds-area"
        />
        <text
          v-if="zoneBetTotal('dont-pass-odds') === 0 && !isDisabled('dont-pass-odds')"
          x="300"
          y="342"
          class="label-odds-hint-sm"
        >LAY ODDS (0% edge)</text>
      </g>

      <!-- ==================== COME ODDS (placed on number boxes when Come point is set) ==================== -->
      <g
        id="come-odds"
        class="zone"
        :class="{ disabled: isDisabled('come-odds') }"
        tabindex="-1"
        @click="handleZoneClick('come-odds')"
      >
      <!-- Come odds appear as a small zone above each number box where a come bet is established -->
      </g>

      <!-- ==================== DON'T COME ODDS ==================== -->
      <g
        id="dont-come-odds"
        class="zone"
        :class="{ disabled: isDisabled('dont-come-odds') }"
        tabindex="-1"
        @click="handleZoneClick('dont-come-odds')"
      />

      <!-- ==================== CENTER PROPOSITION BETS ==================== -->
      <g
        id="center-props"
        transform="translate(730, 30)"
      >
        <!-- Background panel -->
        <rect
          x="0"
          y="0"
          width="440"
          height="540"
          rx="8"
          fill="rgba(0,40,20,0.5)"
          stroke="#8B6914"
          stroke-width="1.5"
        />

        <text
          x="220"
          y="28"
          class="label-section-title"
        >PROPOSITION BETS</text>

        <!-- Hardways row -->
        <g
          id="hardways"
          transform="translate(0, 40)"
        >
          <!-- Hard 4 -->
          <g
            id="hard-4"
            class="zone"
            :class="{ disabled: isDisabled('hard-4') }"
            role="button"
            :tabindex="isDisabled('hard-4') ? -1 : 0"
            :aria-label="zoneAriaLabel('hard-4')"
            :aria-disabled="isDisabled('hard-4') || undefined"
            @click="handleZoneClick('hard-4')"
          >
            <rect
              x="10"
              y="0"
              width="100"
              height="55"
              rx="3"
              class="zone-fill-prop"
            />
            <text
              x="60"
              y="20"
              class="label-prop"
            >HARD 4</text>
            <text
              x="60"
              y="42"
              class="label-prop-payout"
            >7 to 1</text>
          </g>

          <!-- Hard 6 -->
          <g
            id="hard-6"
            class="zone"
            :class="{ disabled: isDisabled('hard-6') }"
            role="button"
            :tabindex="isDisabled('hard-6') ? -1 : 0"
            :aria-label="zoneAriaLabel('hard-6')"
            :aria-disabled="isDisabled('hard-6') || undefined"
            @click="handleZoneClick('hard-6')"
          >
            <rect
              x="115"
              y="0"
              width="100"
              height="55"
              rx="3"
              class="zone-fill-prop"
            />
            <text
              x="165"
              y="20"
              class="label-prop"
            >HARD 6</text>
            <text
              x="165"
              y="42"
              class="label-prop-payout"
            >9 to 1</text>
          </g>

          <!-- Hard 8 -->
          <g
            id="hard-8"
            class="zone"
            :class="{ disabled: isDisabled('hard-8') }"
            role="button"
            :tabindex="isDisabled('hard-8') ? -1 : 0"
            :aria-label="zoneAriaLabel('hard-8')"
            :aria-disabled="isDisabled('hard-8') || undefined"
            @click="handleZoneClick('hard-8')"
          >
            <rect
              x="220"
              y="0"
              width="100"
              height="55"
              rx="3"
              class="zone-fill-prop"
            />
            <text
              x="270"
              y="20"
              class="label-prop"
            >HARD 8</text>
            <text
              x="270"
              y="42"
              class="label-prop-payout"
            >9 to 1</text>
          </g>

          <!-- Hard 10 -->
          <g
            id="hard-10"
            class="zone"
            :class="{ disabled: isDisabled('hard-10') }"
            role="button"
            :tabindex="isDisabled('hard-10') ? -1 : 0"
            :aria-label="zoneAriaLabel('hard-10')"
            :aria-disabled="isDisabled('hard-10') || undefined"
            @click="handleZoneClick('hard-10')"
          >
            <rect
              x="325"
              y="0"
              width="100"
              height="55"
              rx="3"
              class="zone-fill-prop"
            />
            <text
              x="375"
              y="20"
              class="label-prop"
            >HARD 10</text>
            <text
              x="375"
              y="42"
              class="label-prop-payout"
            >7 to 1</text>
          </g>
        </g>

        <!-- Any Seven -->
        <g
          id="any-seven"
          class="zone"
          :class="{ disabled: isDisabled('any-seven') }"
          role="button"
          :tabindex="isDisabled('any-seven') ? -1 : 0"
          :aria-label="zoneAriaLabel('any-seven')"
          :aria-disabled="isDisabled('any-seven') || undefined"
          @click="handleZoneClick('any-seven')"
        >
          <rect
            x="10"
            y="105"
            width="420"
            height="50"
            rx="3"
            class="zone-fill-prop"
          />
          <text
            x="220"
            y="128"
            class="label-prop-large"
          >ANY SEVEN</text>
          <text
            x="220"
            y="148"
            class="label-prop-payout"
          >4 to 1</text>
        </g>

        <!-- Any Craps -->
        <g
          id="any-craps"
          class="zone"
          :class="{ disabled: isDisabled('any-craps') }"
          role="button"
          :tabindex="isDisabled('any-craps') ? -1 : 0"
          :aria-label="zoneAriaLabel('any-craps')"
          :aria-disabled="isDisabled('any-craps') || undefined"
          @click="handleZoneClick('any-craps')"
        >
          <rect
            x="10"
            y="165"
            width="420"
            height="50"
            rx="3"
            class="zone-fill-prop"
          />
          <text
            x="220"
            y="188"
            class="label-prop-large"
          >ANY CRAPS</text>
          <text
            x="220"
            y="208"
            class="label-prop-payout"
          >7 to 1</text>
        </g>

        <!-- Single-roll number bets -->
        <g
          id="single-roll-numbers"
          transform="translate(0, 230)"
        >
          <!-- Aces / Snake Eyes (2) -->
          <g
            id="aces"
            class="zone"
            :class="{ disabled: isDisabled('aces') }"
            role="button"
            :tabindex="isDisabled('aces') ? -1 : 0"
            :aria-label="zoneAriaLabel('aces')"
            :aria-disabled="isDisabled('aces') || undefined"
            @click="handleZoneClick('aces')"
          >
            <rect
              x="10"
              y="0"
              width="100"
              height="60"
              rx="3"
              class="zone-fill-prop"
            />
            <text
              x="60"
              y="20"
              class="label-prop"
            >ACES</text>
            <text
              x="60"
              y="36"
              class="label-prop-sub"
            >(Snake Eyes)</text>
            <text
              x="60"
              y="52"
              class="label-prop-payout"
            >30 to 1</text>
          </g>

          <!-- Ace-Deuce (3) -->
          <g
            id="ace-deuce"
            class="zone"
            :class="{ disabled: isDisabled('ace-deuce') }"
            role="button"
            :tabindex="isDisabled('ace-deuce') ? -1 : 0"
            :aria-label="zoneAriaLabel('ace-deuce')"
            :aria-disabled="isDisabled('ace-deuce') || undefined"
            @click="handleZoneClick('ace-deuce')"
          >
            <rect
              x="115"
              y="0"
              width="100"
              height="60"
              rx="3"
              class="zone-fill-prop"
            />
            <text
              x="165"
              y="20"
              class="label-prop"
            >ACE-DEUCE</text>
            <text
              x="165"
              y="36"
              class="label-prop-sub"
            >(Three)</text>
            <text
              x="165"
              y="52"
              class="label-prop-payout"
            >15 to 1</text>
          </g>

          <!-- Yo / Eleven (11) -->
          <g
            id="yo-eleven"
            class="zone"
            :class="{ disabled: isDisabled('yo-eleven') }"
            role="button"
            :tabindex="isDisabled('yo-eleven') ? -1 : 0"
            :aria-label="zoneAriaLabel('yo-eleven')"
            :aria-disabled="isDisabled('yo-eleven') || undefined"
            @click="handleZoneClick('yo-eleven')"
          >
            <rect
              x="220"
              y="0"
              width="100"
              height="60"
              rx="3"
              class="zone-fill-prop"
            />
            <text
              x="270"
              y="20"
              class="label-prop"
            >YO</text>
            <text
              x="270"
              y="36"
              class="label-prop-sub"
            >(Eleven)</text>
            <text
              x="270"
              y="52"
              class="label-prop-payout"
            >15 to 1</text>
          </g>

          <!-- Boxcars (12) -->
          <g
            id="boxcars"
            class="zone"
            :class="{ disabled: isDisabled('boxcars') }"
            role="button"
            :tabindex="isDisabled('boxcars') ? -1 : 0"
            :aria-label="zoneAriaLabel('boxcars')"
            :aria-disabled="isDisabled('boxcars') || undefined"
            @click="handleZoneClick('boxcars')"
          >
            <rect
              x="325"
              y="0"
              width="100"
              height="60"
              rx="3"
              class="zone-fill-prop"
            />
            <text
              x="375"
              y="20"
              class="label-prop"
            >BOXCARS</text>
            <text
              x="375"
              y="36"
              class="label-prop-sub"
            >(Twelve)</text>
            <text
              x="375"
              y="52"
              class="label-prop-payout"
            >30 to 1</text>
          </g>
        </g>

        <!-- C&E -->
        <g
          id="craps-eleven"
          class="zone"
          :class="{ disabled: isDisabled('craps-eleven') }"
          role="button"
          :tabindex="isDisabled('craps-eleven') ? -1 : 0"
          :aria-label="zoneAriaLabel('craps-eleven')"
          :aria-disabled="isDisabled('craps-eleven') || undefined"
          @click="handleZoneClick('craps-eleven')"
        >
          <rect
            x="10"
            y="300"
            width="205"
            height="50"
            rx="3"
            class="zone-fill-prop"
          />
          <text
            x="112"
            y="322"
            class="label-prop-large"
          >C &amp; E</text>
          <text
            x="112"
            y="342"
            class="label-prop-sub"
          >Craps &amp; Eleven</text>
        </g>

        <!-- Horn -->
        <g
          id="horn"
          class="zone"
          :class="{ disabled: isDisabled('horn') }"
          role="button"
          :tabindex="isDisabled('horn') ? -1 : 0"
          :aria-label="zoneAriaLabel('horn')"
          :aria-disabled="isDisabled('horn') || undefined"
          @click="handleZoneClick('horn')"
        >
          <rect
            x="220"
            y="300"
            width="100"
            height="50"
            rx="3"
            class="zone-fill-prop"
          />
          <text
            x="270"
            y="322"
            class="label-prop-large"
          >HORN</text>
          <text
            x="270"
            y="342"
            class="label-prop-sub"
          >2-3-11-12</text>
        </g>

        <!-- Horn High -->
        <g
          id="horn-high"
          class="zone"
          :class="{ disabled: isDisabled('horn-high') }"
          role="button"
          :tabindex="isDisabled('horn-high') ? -1 : 0"
          :aria-label="zoneAriaLabel('horn-high')"
          :aria-disabled="isDisabled('horn-high') || undefined"
          @click="handleZoneClick('horn-high')"
        >
          <rect
            x="325"
            y="300"
            width="100"
            height="50"
            rx="3"
            class="zone-fill-prop"
          />
          <text
            x="375"
            y="322"
            class="label-prop-large"
          >HORN</text>
          <text
            x="375"
            y="342"
            class="label-prop-sub"
          >HIGH</text>
        </g>

        <!-- Hop bets (small reference zones) -->
        <g
          id="hop-easy"
          class="zone"
          :class="{ disabled: isDisabled('hop-easy') }"
          role="button"
          :tabindex="isDisabled('hop-easy') ? -1 : 0"
          :aria-label="zoneAriaLabel('hop-easy')"
          :aria-disabled="isDisabled('hop-easy') || undefined"
          @click="handleZoneClick('hop-easy')"
        >
          <rect
            x="10"
            y="360"
            width="205"
            height="40"
            rx="3"
            class="zone-fill-prop"
          />
          <text
            x="112"
            y="378"
            class="label-prop-sub"
          >HOP (Easy)</text>
          <text
            x="112"
            y="394"
            class="label-prop-payout"
          >15 to 1</text>
        </g>

        <g
          id="hop-hard"
          class="zone"
          :class="{ disabled: isDisabled('hop-hard') }"
          role="button"
          :tabindex="isDisabled('hop-hard') ? -1 : 0"
          :aria-label="zoneAriaLabel('hop-hard')"
          :aria-disabled="isDisabled('hop-hard') || undefined"
          @click="handleZoneClick('hop-hard')"
        >
          <rect
            x="220"
            y="360"
            width="205"
            height="40"
            rx="3"
            class="zone-fill-prop"
          />
          <text
            x="322"
            y="378"
            class="label-prop-sub"
          >HOP (Hard)</text>
          <text
            x="322"
            y="394"
            class="label-prop-payout"
          >30 to 1</text>
        </g>

        <!-- Buy/Lay reference labels -->
        <text
          x="220"
          y="430"
          class="label-section-sub"
        >BUY / LAY BETS</text>
        <text
          x="220"
          y="448"
          class="label-prop-sub"
        >Place bets on number boxes above</text>
        <text
          x="220"
          y="464"
          class="label-prop-sub"
        >Buy: 5% commission, true odds</text>
      </g>

      <!-- ==================== BUY ZONES (overlaid on number boxes) ==================== -->
      <g
        id="buy-zones"
        opacity="0"
      >
        <g id="buy-4"><rect
          x="105"
          y="30"
          width="50"
          height="20"
        /></g>
        <g id="buy-5"><rect
          x="205"
          y="30"
          width="50"
          height="20"
        /></g>
        <g id="buy-6"><rect
          x="305"
          y="30"
          width="50"
          height="20"
        /></g>
        <g id="buy-8"><rect
          x="405"
          y="30"
          width="50"
          height="20"
        /></g>
        <g id="buy-9"><rect
          x="505"
          y="30"
          width="50"
          height="20"
        /></g>
        <g id="buy-10"><rect
          x="605"
          y="30"
          width="50"
          height="20"
        /></g>
      </g>

      <!-- ==================== LAY ZONES (overlaid on number boxes) ==================== -->
      <g
        id="lay-zones"
        opacity="0"
      >
        <g id="lay-4"><rect
          x="155"
          y="30"
          width="50"
          height="20"
        /></g>
        <g id="lay-5"><rect
          x="255"
          y="30"
          width="50"
          height="20"
        /></g>
        <g id="lay-6"><rect
          x="355"
          y="30"
          width="50"
          height="20"
        /></g>
        <g id="lay-8"><rect
          x="455"
          y="30"
          width="50"
          height="20"
        /></g>
        <g id="lay-9"><rect
          x="555"
          y="30"
          width="50"
          height="20"
        /></g>
        <g id="lay-10"><rect
          x="655"
          y="30"
          width="50"
          height="20"
        /></g>
      </g>

      <!-- ==================== ZONE OUTLINES (drawn on top) ==================== -->
      <g
        id="zone-borders"
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        stroke-width="1.5"
        pointer-events="none"
      >
        <!-- Number box borders -->
        <rect
          x="105"
          y="30"
          width="100"
          height="80"
          rx="3"
        />
        <rect
          x="205"
          y="30"
          width="100"
          height="80"
          rx="3"
        />
        <rect
          x="305"
          y="30"
          width="100"
          height="80"
          rx="3"
        />
        <rect
          x="405"
          y="30"
          width="100"
          height="80"
          rx="3"
        />
        <rect
          x="505"
          y="30"
          width="100"
          height="80"
          rx="3"
        />
        <rect
          x="605"
          y="30"
          width="100"
          height="80"
          rx="3"
        />
        <!-- Big 6/8 -->
        <rect
          x="30"
          y="30"
          width="75"
          height="40"
          rx="3"
        />
        <rect
          x="30"
          y="70"
          width="75"
          height="40"
          rx="3"
        />
        <!-- Don't Come -->
        <rect
          x="105"
          y="115"
          width="600"
          height="35"
          rx="3"
        />
        <!-- Come -->
        <rect
          x="105"
          y="155"
          width="600"
          height="90"
          rx="3"
        />
        <!-- Field -->
        <rect
          x="105"
          y="250"
          width="600"
          height="65"
          rx="3"
        />
        <!-- Don't Pass -->
        <rect
          x="105"
          y="320"
          width="600"
          height="35"
          rx="3"
        />
        <!-- Pass Line -->
        <path d="M 30,360 L 705,360 L 705,570 L 30,570 Z" />
        <!-- Pass Odds area (dashed when available) -->
        <rect
          x="200"
          y="370"
          width="340"
          height="55"
          rx="5"
          stroke-dasharray="6 4"
          opacity="0.3"
        />
      </g>

      <!-- ==================== ACTIVE BET CHIPS ==================== -->
      <TableBetChipsLayer :zone-totals="zoneTotals" />

      <!-- ==================== PUCK ==================== -->
      <g
        id="puck"
        pointer-events="none"
      >
        <!-- OFF puck (black) -->
        <g v-if="puckState === 'OFF'">
          <circle
            :cx="puckX"
            :cy="puckY"
            r="20"
            fill="#111"
            stroke="#555"
            stroke-width="2.5"
          />
          <text
            :x="puckX"
            :y="puckY + 1"
            class="puck-text-off"
          >OFF</text>
        </g>
        <!-- ON puck (white) -->
        <g v-else-if="puckState === 'ON'">
          <circle
            :cx="puckX"
            :cy="puckY"
            r="20"
            fill="#fff"
            stroke="#333"
            stroke-width="2.5"
          />
          <text
            :x="puckX"
            :y="puckY + 1"
            class="puck-text-on"
          >ON</text>
        </g>
      </g>
    </svg>

    <!-- Study mode tooltip -->
    <TableStudyTooltip
      v-if="studyMode && studyHoveredZone"
      :zone-id="studyHoveredZone"
      :x="studyTooltipPos.x"
      :y="studyTooltipPos.y"
      :has-bet-amount="zoneBetTotal(studyHoveredZone)"
      :disabled="isDisabled(studyHoveredZone)"
      :game-phase="gamePhase"
    />
  </div>
</template>

<style scoped>
/* ===== Zone fills ===== */
.zone-fill {
  fill: rgba(0, 80, 40, 0.35);
  transition: fill 0.15s ease;
}

.zone-fill-prop {
  fill: rgba(80, 0, 0, 0.3);
  transition: fill 0.15s ease;
}

/* Odds area: visible clickable zone */
.zone-fill-odds-area {
  fill: rgba(0, 60, 30, 0.15);
  stroke: none;
  transition: fill 0.15s ease, stroke 0.15s ease;
}

/* Pulsing dashed border when odds are available but not placed */
.zone.odds-available .zone-fill-odds-area {
  stroke: rgba(100, 220, 100, 0.5);
  stroke-width: 2;
  stroke-dasharray: 6 4;
  animation: odds-pulse 2s ease-in-out infinite;
}

@keyframes odds-pulse {
  0%, 100% { stroke-opacity: 0.3; }
  50% { stroke-opacity: 0.8; }
}

/* ===== Cursor: pointer on enabled zones ===== */
.zone {
  cursor: pointer;
}

/* ===== Hover states ===== */
.zone:hover .zone-fill {
  fill: rgba(0, 120, 60, 0.55);
}

.zone:hover .zone-fill-odds-area {
  fill: rgba(0, 120, 60, 0.4);
  stroke: rgba(100, 255, 100, 0.8);
  stroke-width: 2;
  stroke-dasharray: none;
}

.zone:hover .zone-fill-prop {
  fill: rgba(140, 20, 20, 0.5);
}

/* ===== Disabled state ===== */
.zone.disabled {
  opacity: 0.35;
  pointer-events: none;
  cursor: not-allowed;
}

.zone.disabled .zone-fill-odds-area {
  stroke: none;
  fill: transparent;
}

/* Odds hint text */
.label-odds-hint {
  fill: rgba(100, 220, 100, 0.7);
  font-family: 'Arial', sans-serif;
  font-size: 12px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  letter-spacing: 0.5px;
}

.label-odds-hint-sm {
  fill: rgba(100, 220, 100, 0.7);
  font-family: 'Arial', sans-serif;
  font-size: 10px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

/* ===== Text styles ===== */

/* Number box large number */
.label-number {
  fill: #fff;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 28px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

/* Payout text under numbers */
.label-payout {
  fill: #ffd700;
  font-family: 'Arial', sans-serif;
  font-size: 11px;
  text-anchor: middle;
  dominant-baseline: central;
}

/* Main zone labels (Don't Pass, Don't Come) */
.label-main {
  fill: #fff;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 14px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* Large zone labels (Come) */
.label-large {
  fill: #fff;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 32px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  letter-spacing: 4px;
  text-transform: uppercase;
}

/* Pass Line label */
.label-pass {
  fill: #fff;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 36px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  letter-spacing: 3px;
  text-transform: uppercase;
}

/* Big 6/8 labels */
.label-big {
  fill: #fff;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 13px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

/* Field title */
.label-field-title {
  fill: #fff;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 22px;
  font-weight: bold;
  dominant-baseline: central;
}

/* Field regular numbers */
.label-field-num {
  fill: #fff;
  font-family: 'Arial', sans-serif;
  font-size: 16px;
  text-anchor: middle;
  dominant-baseline: central;
}

/* Field bonus numbers (2 and 12) */
.label-field-bonus {
  fill: #ff4444;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 20px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

/* Field payout labels */
.label-field-pay {
  fill: #ffd700;
  font-family: 'Arial', sans-serif;
  font-size: 10px;
  text-anchor: middle;
  dominant-baseline: central;
}

/* Don't Pass 12 circle */
.label-dp-twelve {
  fill: #fff;
  font-family: 'Arial', sans-serif;
  font-size: 16px;
  text-anchor: middle;
  dominant-baseline: central;
}

/* Center props section title */
.label-section-title {
  fill: #ffd700;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 16px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  letter-spacing: 2px;
}

.label-section-sub {
  fill: #ffd700;
  font-family: 'Arial', sans-serif;
  font-size: 13px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  letter-spacing: 1px;
}

/* Prop bet label */
.label-prop {
  fill: #ff6666;
  font-family: 'Arial', sans-serif;
  font-size: 12px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  text-transform: uppercase;
}

.label-prop-large {
  fill: #ff4444;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 16px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  letter-spacing: 1px;
}

/* Prop bet sub-label */
.label-prop-sub {
  fill: rgba(255, 255, 255, 0.65);
  font-family: 'Arial', sans-serif;
  font-size: 9px;
  text-anchor: middle;
  dominant-baseline: central;
}

/* Prop bet payout */
.label-prop-payout {
  fill: #ffd700;
  font-family: 'Arial', sans-serif;
  font-size: 11px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

/* ===== Puck text ===== */
.puck-text-off {
  fill: #fff;
  font-family: 'Arial', sans-serif;
  font-size: 14px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

.puck-text-on {
  fill: #111;
  font-family: 'Arial', sans-serif;
  font-size: 14px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

/* ===== Study mode ===== */
.study-mode {
  cursor: help !important;
}

.study-mode .zone {
  cursor: help !important;
}

.study-mode .zone:hover .zone-fill,
.study-mode .zone:hover .zone-fill-prop {
  fill: rgba(60, 120, 180, 0.4);
}

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
</style>
