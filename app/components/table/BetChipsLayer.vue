<script setup lang="ts">
import type { ActiveBet, BetType } from '~/utils/betTypes'
import { betTypeToNumber, isBuyBet, isLayBet, isPlaceBet } from '~/utils/betTypes'
import { canToggleWorking } from '~/engine/betting'

/**
 * Draws one chip per spot the player has money on. Every bet type has a spot:
 * a bet that is on the table but invisible on the felt reads as "my click did
 * nothing".
 */
const props = defineProps<{
  bets: ActiveBet[]
}>()

interface Spot {
  /** Bets sharing a key are stacked into one chip. */
  key: string
  x: number
  y: number
  r: number
  fill: string
  /** Small caption under the chip, where there is room for one. */
  tag?: string
}

interface Chip extends Spot {
  amount: number
  /** Every bet in the stack is called OFF. */
  off: boolean
}

const RED = '#CC0000' // flat bets
const GREEN = '#1a7a1a' // odds
const DARK = '#333333' // don't side
const BLUE = '#1d4ed8' // buy
const PURPLE = '#6d28d9' // lay

/** Left edge of each number box (boxes are 100 wide, y 30–110). */
const BOX_X: Record<number, number> = { 4: 105, 5: 205, 6: 305, 8: 405, 9: 505, 10: 605 }
/** Centre-prop cells sit in a 4-column grid, 105 apart. */
const col = (i: number) => 790 + i * 105

const FIXED: Partial<Record<BetType, Omit<Spot, 'key'>>> = {
  pass: { x: 370, y: 460, r: 18, fill: RED },
  passOdds: { x: 370, y: 395, r: 16, fill: GREEN, tag: 'ODDS' },
  dontPass: { x: 300, y: 338, r: 14, fill: DARK },
  dontPassOdds: { x: 250, y: 338, r: 14, fill: GREEN },
  field: { x: 405, y: 282, r: 16, fill: RED },
  // Centre and corner cells: chip toward the right edge, clear of the label
  big6: { x: 91, y: 50, r: 10, fill: RED },
  big8: { x: 91, y: 90, r: 10, fill: RED },
  hard4: { x: col(0) + 36, y: 98, r: 11, fill: RED },
  hard6: { x: col(1) + 36, y: 98, r: 11, fill: RED },
  hard8: { x: col(2) + 36, y: 98, r: 11, fill: RED },
  hard10: { x: col(3) + 36, y: 98, r: 11, fill: RED },
  any7: { x: 1135, y: 157, r: 13, fill: RED },
  anyCraps: { x: 1135, y: 217, r: 13, fill: RED },
  // One-roll numbers: chip in the cell's lower-right corner, clear of the label
  aces: { x: col(0) + 32, y: 306, r: 11, fill: RED },
  aceDeuce: { x: col(1) + 32, y: 306, r: 11, fill: RED },
  yo: { x: col(2) + 32, y: 306, r: 11, fill: RED },
  boxcars: { x: col(3) + 32, y: 306, r: 11, fill: RED },
  crapsEleven: { x: 925, y: 355, r: 11, fill: RED },
  horn: { x: 1032, y: 355, r: 11, fill: RED },
  hornHigh: { x: 1137, y: 355, r: 11, fill: RED },
  hopEasy: { x: 925, y: 410, r: 11, fill: RED },
  hopHard: { x: 1137, y: 410, r: 11, fill: RED }
}

function spotFor(bet: ActiveBet): Spot | null {
  const { type } = bet

  // Number-box bets. The puck owns the middle of the box, so wagers sit along
  // the bottom edge and travelling come bets along the top.
  if (isPlaceBet(type) || isBuyBet(type) || isLayBet(type)) {
    const x0 = BOX_X[betTypeToNumber(type) ?? 0]
    if (x0 === undefined) return null
    if (isBuyBet(type)) return { key: type, x: x0 + 20, y: 98, r: 10, fill: BLUE }
    if (isLayBet(type)) return { key: type, x: x0 + 80, y: 98, r: 10, fill: PURPLE }
    return { key: type, x: x0 + 50, y: 99, r: 10, fill: RED }
  }

  if (type === 'come' || type === 'dontCome' || type === 'comeOdds' || type === 'dontComeOdds') {
    const x0 = bet.pointNumber === null ? undefined : BOX_X[bet.pointNumber]
    // Still waiting for its point: the chip is in the Come / Don't Come bar.
    if (x0 === undefined) {
      if (type === 'come') return { key: 'come', x: 405, y: 200, r: 18, fill: RED }
      if (type === 'dontCome') return { key: 'dontCome', x: 300, y: 133, r: 14, fill: DARK }
      return null
    }
    // Point established: the bet has moved to its number, odds beside it.
    const key = `${type}-${bet.pointNumber}`
    if (type === 'come') return { key, x: x0 + 13, y: 41, r: 9, fill: RED }
    if (type === 'comeOdds') return { key, x: x0 + 32, y: 41, r: 9, fill: GREEN }
    if (type === 'dontCome') return { key, x: x0 + 87, y: 41, r: 9, fill: DARK }
    return { key, x: x0 + 68, y: 41, r: 9, fill: GREEN }
  }

  const fixed = FIXED[type]
  return fixed ? { key: type, ...fixed } : null
}

const chips = computed<Chip[]>(() => {
  const stacks = new Map<string, Chip>()
  for (const bet of props.bets) {
    if (bet.status === 'resolved') continue
    const spot = spotFor(bet)
    if (!spot) continue
    const off = canToggleWorking(bet.type) && !bet.isWorking
    const stack = stacks.get(spot.key)
    if (stack) {
      stack.amount += bet.amount
      stack.off &&= off
    } else {
      stacks.set(spot.key, { ...spot, amount: bet.amount, off })
    }
  }
  return [...stacks.values()]
})

function textClass(r: number): string {
  if (r >= 16) return 'chip-text'
  if (r >= 13) return 'chip-text-sm'
  return 'chip-text-xs'
}
</script>

<template>
  <!-- eslint-disable vue/multiline-html-element-content-newline -- SVG fragment root (no <svg> ancestor in this file), whitespace inside <text> is significant -->
  <g
    id="bet-chips"
    pointer-events="none"
  >
    <g
      v-for="chip in chips"
      :key="chip.key"
      :data-chip="chip.key"
    >
      <g :opacity="chip.off ? 0.5 : 1">
        <circle
          :cx="chip.x"
          :cy="chip.y"
          :r="chip.r"
          :fill="chip.fill"
          stroke="#fff"
          :stroke-width="chip.r >= 13 ? 2 : 1.5"
        />
        <text
          :x="chip.x"
          :y="chip.y"
          :class="textClass(chip.r)"
        >{{ formatChipAmount(chip.amount) }}</text>
        <text
          v-if="chip.tag"
          :x="chip.x"
          :y="chip.y + chip.r + 5"
          class="label-odds-chip"
        >{{ chip.tag }}</text>
      </g>
      <text
        v-if="chip.off"
        :x="chip.x"
        :y="chip.y - chip.r - 4"
        class="label-off"
      >OFF</text>
    </g>
  </g>
</template>

<style scoped>
/* ===== Chip text ===== */
.chip-text,
.chip-text-sm,
.chip-text-xs {
  fill: #fff;
  font-family: 'Arial', sans-serif;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

.chip-text {
  font-size: 11px;
}

.chip-text-sm {
  font-size: 9px;
}

.chip-text-xs {
  font-size: 8px;
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

/* A bet that is called off */
.label-off {
  fill: #fbbf24;
  font-family: 'Arial', sans-serif;
  font-size: 7px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.75);
  stroke-width: 2px;
}
</style>
