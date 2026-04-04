<script setup lang="ts">
import type { ActiveBet } from '~/utils/betTypes'
import { BET_TYPE_TO_ZONE } from '~/utils/betTypes'

interface Props {
  activeBets?: ActiveBet[]
  disabledZones?: string[]
  puckState?: 'ON' | 'OFF'
  puckPoint?: number | null
  devReferenceUnderlay?: boolean
  studyMode?: boolean
  gamePhase?: string
}

const props = withDefaults(defineProps<Props>(), {
  activeBets: () => [],
  disabledZones: () => [],
  puckState: 'OFF',
  puckPoint: null,
  devReferenceUnderlay: false,
  studyMode: false,
  gamePhase: 'SETUP',
})

const emit = defineEmits<{
  'zone-click': [zoneId: string]
}>()

function isDisabled(zoneId: string): boolean {
  return props.disabledZones.includes(zoneId)
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

/** Get context-aware study explanation for a zone */
function getStudyExplanation(zoneId: string): { title: string; body: string; status: string; edge: string } | null {
  const info = zoneDescriptions[zoneId]
  if (!info) return null

  const hasBet = zoneBetTotal(zoneId) > 0
  const betAmount = zoneBetTotal(zoneId)
  const disabled = isDisabled(zoneId)
  const phase = props.gamePhase

  let status = ''
  if (hasBet) {
    status = `You have ${formatChipAmount(betAmount)} on this bet.`
  } else if (disabled) {
    if (phase === 'COME_OUT' && ['come', 'dont-come', 'come-odds', 'dont-come-odds'].includes(zoneId)) {
      status = 'Only available during the point phase.'
    } else if (phase === 'POINT_PHASE' && ['pass-line', 'dont-pass'].includes(zoneId)) {
      status = 'Only available on the come-out roll.'
    } else {
      status = 'Not available right now.'
    }
  } else {
    status = 'Available — click to place a bet.'
  }

  return {
    title: info.name,
    body: info.desc,
    status,
    edge: info.edge
  }
}

/** Tooltip descriptions for each zone */
const zoneDescriptions: Record<string, { name: string; desc: string; edge: string }> = {
  'pass-line': { name: 'Pass Line', desc: 'Bet with the shooter. Wins on 7/11, loses on 2/3/12 (come-out). After point: wins if point rolls before 7.', edge: '1.41%' },
  'dont-pass': { name: "Don't Pass", desc: 'Bet against the shooter. Wins on 2/3, pushes on 12 (come-out). After point: wins if 7 rolls before point.', edge: '1.36%' },
  'come': { name: 'Come', desc: 'Like a new Pass Line bet during point phase. Next roll: 7/11 wins, 2/3/12 loses, anything else establishes your Come point.', edge: '1.41%' },
  'dont-come': { name: "Don't Come", desc: "Like a new Don't Pass during point phase. Next roll: 2/3 wins, 12 pushes, 7/11 loses, anything else establishes point.", edge: '1.36%' },
  'field': { name: 'Field', desc: 'One-roll bet. Wins on 2,3,4,9,10,11,12. Loses on 5,6,7,8. Bonus payouts on 2 (2:1) and 12 (3:1).', edge: '2.78%' },
  'pass-odds': { name: 'Pass Odds', desc: 'Extra bet behind Pass Line at true odds. ZERO house edge. Only available after point is set. Always max your odds!', edge: '0%' },
  'dont-pass-odds': { name: "Don't Pass Odds", desc: "Lay odds behind Don't Pass at true odds. Zero house edge.", edge: '0%' },
  'come-odds': { name: 'Come Odds', desc: 'Odds behind an established Come bet. Zero house edge.', edge: '0%' },
  'dont-come-odds': { name: "Don't Come Odds", desc: "Odds behind an established Don't Come bet. Zero house edge.", edge: '0%' },
  'place-4': { name: 'Place 4', desc: 'Bet that 4 rolls before 7. Pays 9:5.', edge: '6.67%' },
  'place-5': { name: 'Place 5', desc: 'Bet that 5 rolls before 7. Pays 7:5.', edge: '4.00%' },
  'place-six': { name: 'Place 6', desc: 'Bet that 6 rolls before 7. Pays 7:6. One of the best Place bets.', edge: '1.52%' },
  'place-8': { name: 'Place 8', desc: 'Bet that 8 rolls before 7. Pays 7:6. One of the best Place bets.', edge: '1.52%' },
  'place-nine': { name: 'Place 9', desc: 'Bet that 9 rolls before 7. Pays 7:5.', edge: '4.00%' },
  'place-10': { name: 'Place 10', desc: 'Bet that 10 rolls before 7. Pays 9:5.', edge: '6.67%' },
  'big-6': { name: 'Big 6', desc: 'Bet 6 rolls before 7. Pays only 1:1 — Place 6 pays 7:6 for the same bet. This is a sucker bet.', edge: '9.09%' },
  'big-8': { name: 'Big 8', desc: 'Bet 8 rolls before 7. Pays only 1:1 — Place 8 pays 7:6 for the same bet. This is a sucker bet.', edge: '9.09%' },
  'hard-4': { name: 'Hard 4', desc: 'Bet that 2+2 rolls before any other 4 or 7. Pays 7:1.', edge: '11.11%' },
  'hard-6': { name: 'Hard 6', desc: 'Bet that 3+3 rolls before any other 6 or 7. Pays 9:1.', edge: '9.09%' },
  'hard-8': { name: 'Hard 8', desc: 'Bet that 4+4 rolls before any other 8 or 7. Pays 9:1.', edge: '9.09%' },
  'hard-10': { name: 'Hard 10', desc: 'Bet that 5+5 rolls before any other 10 or 7. Pays 7:1.', edge: '11.11%' },
  'any-seven': { name: 'Any Seven', desc: 'One-roll bet that the next roll is 7. Pays 4:1. Worst bet on the table.', edge: '16.67%' },
  'any-craps': { name: 'Any Craps', desc: 'One-roll bet on 2, 3, or 12. Pays 7:1.', edge: '11.11%' },
  'aces': { name: 'Aces (Snake Eyes)', desc: 'One-roll bet on 2. Pays 30:1. Very rare hit (1 in 36).', edge: '13.89%' },
  'ace-deuce': { name: 'Ace-Deuce', desc: 'One-roll bet on 3. Pays 15:1.', edge: '11.11%' },
  'yo-eleven': { name: 'Yo (Eleven)', desc: 'One-roll bet on 11. Pays 15:1.', edge: '11.11%' },
  'boxcars': { name: 'Boxcars (Midnight)', desc: 'One-roll bet on 12. Pays 30:1. Very rare hit (1 in 36).', edge: '13.89%' },
  'craps-eleven': { name: 'C & E', desc: 'One-roll bet on any craps (2/3/12) or eleven. Pays 3:1 on craps, 7:1 on eleven.', edge: '11.11%' },
  'horn': { name: 'Horn', desc: '4-unit one-roll bet: $1 each on 2, 3, 11, 12. Wins 30:1 or 15:1 minus 3 losing units.', edge: '12.50%' },
  'horn-high': { name: 'Horn High', desc: '5-unit bet: 4 units as Horn + 1 extra on a chosen number.', edge: '12.50%' },
  'hop-easy': { name: 'Hop (Easy)', desc: 'One-roll bet on a specific non-pair combo. Pays 15:1.', edge: '11.11%' },
  'hop-hard': { name: 'Hop (Hard)', desc: 'One-roll bet on a specific pair combo. Pays 30:1.', edge: '13.89%' },
}

/** Get bets placed on a specific zone */
function betsForZone(zoneId: string): ActiveBet[] {
  return props.activeBets.filter((bet) => {
    return BET_TYPE_TO_ZONE[bet.type] === zoneId && bet.status !== 'resolved'
  })
}

/** Sum of active bet amounts for a zone */
function zoneBetTotal(zoneId: string): number {
  return betsForZone(zoneId).reduce((sum, b) => sum + b.amount, 0)
}

/** Format cents to dollars for chip display */
function formatChipAmount(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}k`
  return `$${dollars}`
}

/** Puck x position based on point number */
const puckPositions: Record<number, number> = {
  4: 155,
  5: 255,
  6: 355,
  8: 455,
  9: 555,
  10: 655,
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
    viewBox="0 0 1200 600"
    xmlns="http://www.w3.org/2000/svg"
    class="craps-table w-full h-auto select-none"
    :class="{ 'study-mode': studyMode }"
    :aria-label="'Craps table'"
    @mousemove="handleStudyMouseMove"
    @mouseleave="handleStudyMouseLeave"
  >
    <defs>
      <!-- Slight transparency fill for zone interactivity -->
      <linearGradient id="felt-sheen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.04)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.06)" />
      </linearGradient>
    </defs>

    <!-- Dev reference underlay -->
    <image
      v-if="devReferenceUnderlay"
      href="~/assets/reference/Craps_table_layout.svg"
      x="0"
      y="0"
      width="1200"
      height="600"
      opacity="0.3"
      preserveAspectRatio="xMidYMid meet"
    />

    <!-- ==================== FELT BACKGROUND ==================== -->
    <rect
      x="0" y="0"
      width="1200" height="600"
      fill="#006633"
      rx="30" ry="30"
    />
    <!-- Table border -->
    <rect
      x="4" y="4"
      width="1192" height="592"
      fill="none"
      stroke="#8B6914"
      stroke-width="6"
      rx="28" ry="28"
    />
    <!-- Inner rail -->
    <rect
      x="14" y="14"
      width="1172" height="572"
      fill="none"
      stroke="#8B6914"
      stroke-width="2"
      rx="22" ry="22"
    />
    <!-- Felt sheen overlay -->
    <rect
      x="14" y="14"
      width="1172" height="572"
      fill="url(#felt-sheen)"
      rx="22" ry="22"
    />

    <!-- ==================== NUMBER BOXES (top row) ==================== -->
    <g id="number-boxes">
      <!-- Place 4 -->
      <g
        id="place-4"
        class="zone"
        :class="{ disabled: isDisabled('place-4') }"
        @click="handleZoneClick('place-4')"
      >
        <rect x="105" y="30" width="100" height="80" rx="3" class="zone-fill" />
        <text x="155" y="58" class="label-number">4</text>
        <text x="155" y="98" class="label-payout">9 to 5</text>
      </g>


      <!-- Place 5 -->
      <g
        id="place-5"
        class="zone"
        :class="{ disabled: isDisabled('place-5') }"
        @click="handleZoneClick('place-5')"
      >
        <rect x="205" y="30" width="100" height="80" rx="3" class="zone-fill" />
        <text x="255" y="58" class="label-number">5</text>
        <text x="255" y="98" class="label-payout">7 to 5</text>
      </g>

      <!-- Place SIX -->
      <g
        id="place-six"
        class="zone"
        :class="{ disabled: isDisabled('place-six') }"
        @click="handleZoneClick('place-six')"
      >
        <rect x="305" y="30" width="100" height="80" rx="3" class="zone-fill" />
        <text x="355" y="58" class="label-number">SIX</text>
        <text x="355" y="98" class="label-payout">7 to 6</text>
      </g>

      <!-- Place 8 -->
      <g
        id="place-8"
        class="zone"
        :class="{ disabled: isDisabled('place-8') }"
        @click="handleZoneClick('place-8')"
      >
        <rect x="405" y="30" width="100" height="80" rx="3" class="zone-fill" />
        <text x="455" y="58" class="label-number">8</text>
        <text x="455" y="98" class="label-payout">7 to 6</text>
      </g>

      <!-- Place NINE -->
      <g
        id="place-nine"
        class="zone"
        :class="{ disabled: isDisabled('place-nine') }"
        @click="handleZoneClick('place-nine')"
      >
        <rect x="505" y="30" width="100" height="80" rx="3" class="zone-fill" />
        <text x="555" y="58" class="label-number">NINE</text>
        <text x="555" y="98" class="label-payout">7 to 5</text>
      </g>

      <!-- Place 10 -->
      <g
        id="place-10"
        class="zone"
        :class="{ disabled: isDisabled('place-10') }"
        @click="handleZoneClick('place-10')"
      >
        <rect x="605" y="30" width="100" height="80" rx="3" class="zone-fill" />
        <text x="655" y="58" class="label-number">10</text>
        <text x="655" y="98" class="label-payout">9 to 5</text>
      </g>
    </g>

    <!-- ==================== BIG 6 / BIG 8 ==================== -->
    <g id="big-bets">
      <g
        id="big-6"
        class="zone"
        :class="{ disabled: isDisabled('big-6') }"
        @click="handleZoneClick('big-6')"
      >
        <rect x="30" y="30" width="75" height="40" rx="3" class="zone-fill" />
        <text x="67" y="56" class="label-big">BIG 6</text>
      </g>
      <g
        id="big-8"
        class="zone"
        :class="{ disabled: isDisabled('big-8') }"
        @click="handleZoneClick('big-8')"
      >
        <rect x="30" y="70" width="75" height="40" rx="3" class="zone-fill" />
        <text x="67" y="96" class="label-big">BIG 8</text>
      </g>
    </g>

    <!-- ==================== DON'T COME BAR ==================== -->
    <g
      id="dont-come"
      class="zone"
      :class="{ disabled: isDisabled('dont-come') }"
      @click="handleZoneClick('dont-come')"
    >
      <rect x="105" y="115" width="600" height="35" rx="3" class="zone-fill" />
      <text x="405" y="138" class="label-main">DON'T COME BAR</text>
    </g>

    <!-- ==================== COME ==================== -->
    <g
      id="come"
      class="zone"
      :class="{ disabled: isDisabled('come') }"
      @click="handleZoneClick('come')"
    >
      <rect x="105" y="155" width="600" height="90" rx="3" class="zone-fill" />
      <text x="405" y="210" class="label-large">COME</text>
    </g>

    <!-- ==================== FIELD ==================== -->
    <g
      id="field"
      class="zone"
      :class="{ disabled: isDisabled('field') }"
      @click="handleZoneClick('field')"
    >
      <rect x="105" y="250" width="600" height="65" rx="3" class="zone-fill" />
      <text x="135" y="290" class="label-field-title">FIELD</text>
      <!-- Field numbers -->
      <text x="230" y="283" class="label-field-bonus">2</text>
      <text x="275" y="290" class="label-field-num">&bull; 3 &bull; 4 &bull; 9 &bull; 10 &bull; 11 &bull;</text>
      <text x="530" y="283" class="label-field-bonus">12</text>
      <!-- Payout callouts -->
      <text x="230" y="305" class="label-field-pay">pays 2 to 1</text>
      <text x="530" y="305" class="label-field-pay">pays 3 to 1</text>
    </g>

    <!-- ==================== DON'T PASS BAR ==================== -->
    <g
      id="dont-pass"
      class="zone"
      :class="{ disabled: isDisabled('dont-pass') }"
      @click="handleZoneClick('dont-pass')"
    >
      <rect x="105" y="320" width="600" height="35" rx="3" class="zone-fill" />
      <text x="405" y="343" class="label-main">DON'T PASS BAR</text>
      <text x="580" y="343" class="label-dp-twelve">&#9323;</text>
    </g>

    <!-- ==================== PASS LINE (L-shaped) ==================== -->
    <g
      id="pass-line"
      class="zone"
      :class="{ disabled: isDisabled('pass-line') }"
      @click="handleZoneClick('pass-line')"
    >
      <!-- Bottom horizontal strip -->
      <path
        d="M 30,360 L 705,360 L 705,570 L 30,570 Z"
        rx="3"
        class="zone-fill"
      />
      <!-- Pass line label (centered in bottom area) -->
      <text x="370" y="490" class="label-pass">PASS LINE</text>
    </g>

    <!-- ==================== PASS ODDS (behind pass line bet) ==================== -->
    <g
      id="pass-odds"
      class="zone"
      :class="{ disabled: isDisabled('pass-odds'), 'odds-available': !isDisabled('pass-odds') && zoneBetTotal('pass-odds') === 0 }"
      @click="handleZoneClick('pass-odds')"
    >
      <rect x="200" y="370" width="340" height="55" rx="5" class="zone-fill-odds-area" />
      <text
        v-if="zoneBetTotal('pass-odds') === 0 && !isDisabled('pass-odds')"
        x="370" y="402"
        class="label-odds-hint"
      >ODDS — click to place (0% edge!)</text>
    </g>

    <!-- ==================== DON'T PASS ODDS ==================== -->
    <g
      id="dont-pass-odds"
      class="zone"
      :class="{ disabled: isDisabled('dont-pass-odds'), 'odds-available': !isDisabled('dont-pass-odds') && zoneBetTotal('dont-pass-odds') === 0 }"
      @click="handleZoneClick('dont-pass-odds')"
    >
      <rect x="200" y="320" width="200" height="35" rx="3" class="zone-fill-odds-area" />
      <text
        v-if="zoneBetTotal('dont-pass-odds') === 0 && !isDisabled('dont-pass-odds')"
        x="300" y="342"
        class="label-odds-hint-sm"
      >LAY ODDS (0% edge)</text>
    </g>

    <!-- ==================== COME ODDS (placed on number boxes when Come point is set) ==================== -->
    <g
      id="come-odds"
      class="zone"
      :class="{ disabled: isDisabled('come-odds') }"
      @click="handleZoneClick('come-odds')"
    >
      <!-- Come odds appear as a small zone above each number box where a come bet is established -->
    </g>

    <!-- ==================== DON'T COME ODDS ==================== -->
    <g
      id="dont-come-odds"
      class="zone"
      :class="{ disabled: isDisabled('dont-come-odds') }"
      @click="handleZoneClick('dont-come-odds')"
    >
    </g>

    <!-- ==================== CENTER PROPOSITION BETS ==================== -->
    <g id="center-props" transform="translate(730, 30)">
      <!-- Background panel -->
      <rect x="0" y="0" width="440" height="540" rx="8" fill="rgba(0,40,20,0.5)" stroke="#8B6914" stroke-width="1.5" />

      <text x="220" y="28" class="label-section-title">PROPOSITION BETS</text>

      <!-- Hardways row -->
      <g id="hardways" transform="translate(0, 40)">
        <!-- Hard 4 -->
        <g
          id="hard-4"
          class="zone"
          :class="{ disabled: isDisabled('hard-4') }"
          @click="handleZoneClick('hard-4')"
        >
          <rect x="10" y="0" width="100" height="55" rx="3" class="zone-fill-prop" />
          <text x="60" y="20" class="label-prop">HARD 4</text>
          <text x="60" y="42" class="label-prop-payout">7 to 1</text>
        </g>

        <!-- Hard 6 -->
        <g
          id="hard-6"
          class="zone"
          :class="{ disabled: isDisabled('hard-6') }"
          @click="handleZoneClick('hard-6')"
        >
          <rect x="115" y="0" width="100" height="55" rx="3" class="zone-fill-prop" />
          <text x="165" y="20" class="label-prop">HARD 6</text>
          <text x="165" y="42" class="label-prop-payout">9 to 1</text>
        </g>

        <!-- Hard 8 -->
        <g
          id="hard-8"
          class="zone"
          :class="{ disabled: isDisabled('hard-8') }"
          @click="handleZoneClick('hard-8')"
        >
          <rect x="220" y="0" width="100" height="55" rx="3" class="zone-fill-prop" />
          <text x="270" y="20" class="label-prop">HARD 8</text>
          <text x="270" y="42" class="label-prop-payout">9 to 1</text>
        </g>

        <!-- Hard 10 -->
        <g
          id="hard-10"
          class="zone"
          :class="{ disabled: isDisabled('hard-10') }"
          @click="handleZoneClick('hard-10')"
        >
          <rect x="325" y="0" width="100" height="55" rx="3" class="zone-fill-prop" />
          <text x="375" y="20" class="label-prop">HARD 10</text>
          <text x="375" y="42" class="label-prop-payout">7 to 1</text>
        </g>
      </g>

      <!-- Any Seven -->
      <g
        id="any-seven"
        class="zone"
        :class="{ disabled: isDisabled('any-seven') }"
        @click="handleZoneClick('any-seven')"
      >
        <rect x="10" y="105" width="420" height="50" rx="3" class="zone-fill-prop" />
        <text x="220" y="128" class="label-prop-large">ANY SEVEN</text>
        <text x="220" y="148" class="label-prop-payout">4 to 1</text>
      </g>

      <!-- Any Craps -->
      <g
        id="any-craps"
        class="zone"
        :class="{ disabled: isDisabled('any-craps') }"
        @click="handleZoneClick('any-craps')"
      >
        <rect x="10" y="165" width="420" height="50" rx="3" class="zone-fill-prop" />
        <text x="220" y="188" class="label-prop-large">ANY CRAPS</text>
        <text x="220" y="208" class="label-prop-payout">7 to 1</text>
      </g>

      <!-- Single-roll number bets -->
      <g id="single-roll-numbers" transform="translate(0, 230)">
        <!-- Aces / Snake Eyes (2) -->
        <g
          id="aces"
          class="zone"
          :class="{ disabled: isDisabled('aces') }"
          @click="handleZoneClick('aces')"
        >
          <rect x="10" y="0" width="100" height="60" rx="3" class="zone-fill-prop" />
          <text x="60" y="20" class="label-prop">ACES</text>
          <text x="60" y="36" class="label-prop-sub">(Snake Eyes)</text>
          <text x="60" y="52" class="label-prop-payout">30 to 1</text>
        </g>

        <!-- Ace-Deuce (3) -->
        <g
          id="ace-deuce"
          class="zone"
          :class="{ disabled: isDisabled('ace-deuce') }"
          @click="handleZoneClick('ace-deuce')"
        >
          <rect x="115" y="0" width="100" height="60" rx="3" class="zone-fill-prop" />
          <text x="165" y="20" class="label-prop">ACE-DEUCE</text>
          <text x="165" y="36" class="label-prop-sub">(Three)</text>
          <text x="165" y="52" class="label-prop-payout">15 to 1</text>
        </g>

        <!-- Yo / Eleven (11) -->
        <g
          id="yo-eleven"
          class="zone"
          :class="{ disabled: isDisabled('yo-eleven') }"
          @click="handleZoneClick('yo-eleven')"
        >
          <rect x="220" y="0" width="100" height="60" rx="3" class="zone-fill-prop" />
          <text x="270" y="20" class="label-prop">YO</text>
          <text x="270" y="36" class="label-prop-sub">(Eleven)</text>
          <text x="270" y="52" class="label-prop-payout">15 to 1</text>
        </g>

        <!-- Boxcars (12) -->
        <g
          id="boxcars"
          class="zone"
          :class="{ disabled: isDisabled('boxcars') }"
          @click="handleZoneClick('boxcars')"
        >
          <rect x="325" y="0" width="100" height="60" rx="3" class="zone-fill-prop" />
          <text x="375" y="20" class="label-prop">BOXCARS</text>
          <text x="375" y="36" class="label-prop-sub">(Twelve)</text>
          <text x="375" y="52" class="label-prop-payout">30 to 1</text>
        </g>
      </g>

      <!-- C&E -->
      <g
        id="craps-eleven"
        class="zone"
        :class="{ disabled: isDisabled('craps-eleven') }"
        @click="handleZoneClick('craps-eleven')"
      >
        <rect x="10" y="300" width="205" height="50" rx="3" class="zone-fill-prop" />
        <text x="112" y="322" class="label-prop-large">C &amp; E</text>
        <text x="112" y="342" class="label-prop-sub">Craps &amp; Eleven</text>
      </g>

      <!-- Horn -->
      <g
        id="horn"
        class="zone"
        :class="{ disabled: isDisabled('horn') }"
        @click="handleZoneClick('horn')"
      >
        <rect x="220" y="300" width="100" height="50" rx="3" class="zone-fill-prop" />
        <text x="270" y="322" class="label-prop-large">HORN</text>
        <text x="270" y="342" class="label-prop-sub">2-3-11-12</text>
      </g>

      <!-- Horn High -->
      <g
        id="horn-high"
        class="zone"
        :class="{ disabled: isDisabled('horn-high') }"
        @click="handleZoneClick('horn-high')"
      >
        <rect x="325" y="300" width="100" height="50" rx="3" class="zone-fill-prop" />
        <text x="375" y="322" class="label-prop-large">HORN</text>
        <text x="375" y="342" class="label-prop-sub">HIGH</text>
      </g>

      <!-- Hop bets (small reference zones) -->
      <g
        id="hop-easy"
        class="zone"
        :class="{ disabled: isDisabled('hop-easy') }"
        @click="handleZoneClick('hop-easy')"
      >
        <rect x="10" y="360" width="205" height="40" rx="3" class="zone-fill-prop" />
        <text x="112" y="378" class="label-prop-sub">HOP (Easy)</text>
        <text x="112" y="394" class="label-prop-payout">15 to 1</text>
      </g>

      <g
        id="hop-hard"
        class="zone"
        :class="{ disabled: isDisabled('hop-hard') }"
        @click="handleZoneClick('hop-hard')"
      >
        <rect x="220" y="360" width="205" height="40" rx="3" class="zone-fill-prop" />
        <text x="322" y="378" class="label-prop-sub">HOP (Hard)</text>
        <text x="322" y="394" class="label-prop-payout">30 to 1</text>
      </g>

      <!-- Buy/Lay reference labels -->
      <text x="220" y="430" class="label-section-sub">BUY / LAY BETS</text>
      <text x="220" y="448" class="label-prop-sub">Place bets on number boxes above</text>
      <text x="220" y="464" class="label-prop-sub">Buy: 5% commission, true odds</text>
    </g>

    <!-- ==================== BUY ZONES (overlaid on number boxes) ==================== -->
    <g id="buy-zones" opacity="0">
      <g id="buy-4"><rect x="105" y="30" width="50" height="20" /></g>
      <g id="buy-5"><rect x="205" y="30" width="50" height="20" /></g>
      <g id="buy-6"><rect x="305" y="30" width="50" height="20" /></g>
      <g id="buy-8"><rect x="405" y="30" width="50" height="20" /></g>
      <g id="buy-9"><rect x="505" y="30" width="50" height="20" /></g>
      <g id="buy-10"><rect x="605" y="30" width="50" height="20" /></g>
    </g>

    <!-- ==================== LAY ZONES (overlaid on number boxes) ==================== -->
    <g id="lay-zones" opacity="0">
      <g id="lay-4"><rect x="155" y="30" width="50" height="20" /></g>
      <g id="lay-5"><rect x="255" y="30" width="50" height="20" /></g>
      <g id="lay-6"><rect x="355" y="30" width="50" height="20" /></g>
      <g id="lay-8"><rect x="455" y="30" width="50" height="20" /></g>
      <g id="lay-9"><rect x="555" y="30" width="50" height="20" /></g>
      <g id="lay-10"><rect x="655" y="30" width="50" height="20" /></g>
    </g>

    <!-- ==================== ZONE OUTLINES (drawn on top) ==================== -->
    <g id="zone-borders" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" pointer-events="none">
      <!-- Number box borders -->
      <rect x="105" y="30" width="100" height="80" rx="3" />
      <rect x="205" y="30" width="100" height="80" rx="3" />
      <rect x="305" y="30" width="100" height="80" rx="3" />
      <rect x="405" y="30" width="100" height="80" rx="3" />
      <rect x="505" y="30" width="100" height="80" rx="3" />
      <rect x="605" y="30" width="100" height="80" rx="3" />
      <!-- Big 6/8 -->
      <rect x="30" y="30" width="75" height="40" rx="3" />
      <rect x="30" y="70" width="75" height="40" rx="3" />
      <!-- Don't Come -->
      <rect x="105" y="115" width="600" height="35" rx="3" />
      <!-- Come -->
      <rect x="105" y="155" width="600" height="90" rx="3" />
      <!-- Field -->
      <rect x="105" y="250" width="600" height="65" rx="3" />
      <!-- Don't Pass -->
      <rect x="105" y="320" width="600" height="35" rx="3" />
      <!-- Pass Line -->
      <path d="M 30,360 L 705,360 L 705,570 L 30,570 Z" />
      <!-- Pass Odds area (dashed when available) -->
      <rect x="200" y="370" width="340" height="55" rx="5" stroke-dasharray="6 4" opacity="0.3" />
    </g>

    <!-- ==================== ACTIVE BET CHIPS ==================== -->
    <g id="bet-chips" pointer-events="none">
      <!-- Pass Line chips -->
      <g v-if="zoneBetTotal('pass-line') > 0">
        <circle cx="370" cy="460" r="18" fill="#CC0000" stroke="#fff" stroke-width="2" />
        <text x="370" y="465" class="chip-text">{{ formatChipAmount(zoneBetTotal('pass-line')) }}</text>
      </g>

      <!-- Pass Odds chips (behind pass line chip) -->
      <g v-if="zoneBetTotal('pass-odds') > 0">
        <circle cx="370" cy="395" r="16" fill="#1a7a1a" stroke="#fff" stroke-width="2" />
        <text x="370" y="400" class="chip-text-sm">{{ formatChipAmount(zoneBetTotal('pass-odds')) }}</text>
        <text x="370" y="415" class="label-odds-chip">ODDS</text>
      </g>

      <!-- Don't Pass Odds chips -->
      <g v-if="zoneBetTotal('dont-pass-odds') > 0">
        <circle cx="250" cy="338" r="14" fill="#1a7a1a" stroke="#fff" stroke-width="2" />
        <text x="250" y="342" class="chip-text-sm">{{ formatChipAmount(zoneBetTotal('dont-pass-odds')) }}</text>
      </g>

      <!-- Don't Pass chips -->
      <g v-if="zoneBetTotal('dont-pass') > 0">
        <circle cx="300" cy="338" r="14" fill="#333" stroke="#fff" stroke-width="2" />
        <text x="300" y="342" class="chip-text-sm">{{ formatChipAmount(zoneBetTotal('dont-pass')) }}</text>
      </g>

      <!-- Come chips -->
      <g v-if="zoneBetTotal('come') > 0">
        <circle cx="405" cy="200" r="18" fill="#CC0000" stroke="#fff" stroke-width="2" />
        <text x="405" y="205" class="chip-text">{{ formatChipAmount(zoneBetTotal('come')) }}</text>
      </g>

      <!-- Don't Come chips -->
      <g v-if="zoneBetTotal('dont-come') > 0">
        <circle cx="300" cy="133" r="14" fill="#333" stroke="#fff" stroke-width="2" />
        <text x="300" y="137" class="chip-text-sm">{{ formatChipAmount(zoneBetTotal('dont-come')) }}</text>
      </g>

      <!-- Field chips -->
      <g v-if="zoneBetTotal('field') > 0">
        <circle cx="405" cy="282" r="16" fill="#CC0000" stroke="#fff" stroke-width="2" />
        <text x="405" y="287" class="chip-text">{{ formatChipAmount(zoneBetTotal('field')) }}</text>
      </g>

      <!-- Number box chips -->
      <template v-for="(num, idx) in [4, 5, 'six', 8, 'nine', 10]" :key="num">
        <g v-if="zoneBetTotal(`place-${num}`) > 0">
          <circle
            :cx="155 + idx * 100"
            cy="75"
            r="14"
            fill="#CC0000"
            stroke="#fff"
            stroke-width="2"
          />
          <text :x="155 + idx * 100" y="79" class="chip-text-sm">
            {{ formatChipAmount(zoneBetTotal(`place-${num}`)) }}
          </text>
        </g>
      </template>

      <!-- Big 6 / Big 8 chips -->
      <g v-if="zoneBetTotal('big-6') > 0">
        <circle cx="67" cy="50" r="12" fill="#CC0000" stroke="#fff" stroke-width="1.5" />
        <text x="67" y="54" class="chip-text-xs">{{ formatChipAmount(zoneBetTotal('big-6')) }}</text>
      </g>
      <g v-if="zoneBetTotal('big-8') > 0">
        <circle cx="67" cy="90" r="12" fill="#CC0000" stroke="#fff" stroke-width="1.5" />
        <text x="67" y="94" class="chip-text-xs">{{ formatChipAmount(zoneBetTotal('big-8')) }}</text>
      </g>

      <!-- Center prop chips (hardways) -->
      <template v-for="(hw, i) in ['hard-4', 'hard-6', 'hard-8', 'hard-10']" :key="hw">
        <g v-if="zoneBetTotal(hw) > 0">
          <circle
            :cx="790 + i * 105"
            cy="90"
            r="12"
            fill="#CC0000"
            stroke="#fff"
            stroke-width="1.5"
          />
          <text :x="790 + i * 105" y="94" class="chip-text-xs">{{ formatChipAmount(zoneBetTotal(hw)) }}</text>
        </g>
      </template>

      <!-- Any Seven chip -->
      <g v-if="zoneBetTotal('any-seven') > 0">
        <circle cx="950" cy="157" r="14" fill="#CC0000" stroke="#fff" stroke-width="2" />
        <text x="950" y="161" class="chip-text-sm">{{ formatChipAmount(zoneBetTotal('any-seven')) }}</text>
      </g>

      <!-- Any Craps chip -->
      <g v-if="zoneBetTotal('any-craps') > 0">
        <circle cx="950" cy="217" r="14" fill="#CC0000" stroke="#fff" stroke-width="2" />
        <text x="950" y="221" class="chip-text-sm">{{ formatChipAmount(zoneBetTotal('any-craps')) }}</text>
      </g>
    </g>

    <!-- ==================== PUCK ==================== -->
    <g id="puck" pointer-events="none">
      <!-- OFF puck (black) -->
      <g v-if="puckState === 'OFF'">
        <circle :cx="puckX" :cy="puckY" r="20" fill="#111" stroke="#555" stroke-width="2.5" />
        <text :x="puckX" :y="puckY + 1" class="puck-text-off">OFF</text>
      </g>
      <!-- ON puck (white) -->
      <g v-else-if="puckState === 'ON'">
        <circle :cx="puckX" :cy="puckY" r="20" fill="#fff" stroke="#333" stroke-width="2.5" />
        <text :x="puckX" :y="puckY + 1" class="puck-text-on">ON</text>
      </g>
    </g>
  </svg>

  <!-- Study mode tooltip (HTML overlay) -->
  <div
    v-if="studyMode && studyHoveredZone && getStudyExplanation(studyHoveredZone)"
    class="study-tooltip"
    :style="{
      left: Math.min(studyTooltipPos.x + 16, 800) + 'px',
      top: (studyTooltipPos.y - 10) + 'px'
    }"
  >
    <div class="study-tooltip-title">{{ getStudyExplanation(studyHoveredZone)!.title }}</div>
    <div class="study-tooltip-edge">House edge: {{ getStudyExplanation(studyHoveredZone)!.edge }}</div>
    <div class="study-tooltip-body">{{ getStudyExplanation(studyHoveredZone)!.body }}</div>
    <div class="study-tooltip-status">{{ getStudyExplanation(studyHoveredZone)!.status }}</div>
  </div>
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

.zone-fill-odds {
  fill: rgba(0, 60, 30, 0.2);
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
.zone:hover .zone-fill,
.zone:hover .zone-fill-odds {
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

/* Odds chip label */
.label-odds-chip {
  fill: rgba(255, 255, 255, 0.6);
  font-family: 'Arial', sans-serif;
  font-size: 7px;
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

/* ===== Chip text ===== */
.chip-text {
  fill: #fff;
  font-family: 'Arial', sans-serif;
  font-size: 11px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

.chip-text-sm {
  fill: #fff;
  font-family: 'Arial', sans-serif;
  font-size: 9px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

.chip-text-xs {
  fill: #fff;
  font-family: 'Arial', sans-serif;
  font-size: 8px;
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

.study-tooltip {
  position: absolute;
  z-index: 100;
  max-width: 320px;
  background: rgba(10, 15, 25, 0.95);
  border: 1px solid #2a4a4a;
  border-radius: 8px;
  padding: 12px 14px;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.study-tooltip-title {
  color: #f0d060;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.study-tooltip-edge {
  color: #4aeeff;
  font-family: 'Courier New', Courier, monospace;
  font-size: 11px;
  margin-bottom: 8px;
}

.study-tooltip-body {
  color: #c0c8d0;
  font-family: 'Arial', sans-serif;
  font-size: 12px;
  line-height: 1.5;
  margin-bottom: 8px;
}

.study-tooltip-status {
  color: #4aee8a;
  font-family: 'Courier New', Courier, monospace;
  font-size: 11px;
  padding-top: 6px;
  border-top: 1px solid #1e3333;
}
</style>
