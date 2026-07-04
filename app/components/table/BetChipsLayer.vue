<script setup lang="ts">
const props = defineProps<{
  zoneTotals: Map<string, number>
}>()

function zoneBetTotal(zoneId: string): number {
  return props.zoneTotals.get(zoneId) ?? 0
}
</script>

<template>
  <!-- eslint-disable vue/multiline-html-element-content-newline -- SVG fragment root (no <svg> ancestor in this file), whitespace inside <text> is significant -->
  <g
    id="bet-chips"
    pointer-events="none"
  >
    <!-- Pass Line chips -->
    <g v-if="zoneBetTotal('pass-line') > 0">
      <circle
        cx="370"
        cy="460"
        r="18"
        fill="#CC0000"
        stroke="#fff"
        stroke-width="2"
      />
      <text
        x="370"
        y="465"
        class="chip-text"
      >{{ formatChipAmount(zoneBetTotal('pass-line')) }}</text>
    </g>

    <!-- Pass Odds chips (behind pass line chip) -->
    <g v-if="zoneBetTotal('pass-odds') > 0">
      <circle
        cx="370"
        cy="395"
        r="16"
        fill="#1a7a1a"
        stroke="#fff"
        stroke-width="2"
      />
      <text
        x="370"
        y="400"
        class="chip-text-sm"
      >{{ formatChipAmount(zoneBetTotal('pass-odds')) }}</text>
      <text
        x="370"
        y="415"
        class="label-odds-chip"
      >ODDS</text>
    </g>

    <!-- Don't Pass Odds chips -->
    <g v-if="zoneBetTotal('dont-pass-odds') > 0">
      <circle
        cx="250"
        cy="338"
        r="14"
        fill="#1a7a1a"
        stroke="#fff"
        stroke-width="2"
      />
      <text
        x="250"
        y="342"
        class="chip-text-sm"
      >{{ formatChipAmount(zoneBetTotal('dont-pass-odds')) }}</text>
    </g>

    <!-- Don't Pass chips -->
    <g v-if="zoneBetTotal('dont-pass') > 0">
      <circle
        cx="300"
        cy="338"
        r="14"
        fill="#333"
        stroke="#fff"
        stroke-width="2"
      />
      <text
        x="300"
        y="342"
        class="chip-text-sm"
      >{{ formatChipAmount(zoneBetTotal('dont-pass')) }}</text>
    </g>

    <!-- Come chips -->
    <g v-if="zoneBetTotal('come') > 0">
      <circle
        cx="405"
        cy="200"
        r="18"
        fill="#CC0000"
        stroke="#fff"
        stroke-width="2"
      />
      <text
        x="405"
        y="205"
        class="chip-text"
      >{{ formatChipAmount(zoneBetTotal('come')) }}</text>
    </g>

    <!-- Don't Come chips -->
    <g v-if="zoneBetTotal('dont-come') > 0">
      <circle
        cx="300"
        cy="133"
        r="14"
        fill="#333"
        stroke="#fff"
        stroke-width="2"
      />
      <text
        x="300"
        y="137"
        class="chip-text-sm"
      >{{ formatChipAmount(zoneBetTotal('dont-come')) }}</text>
    </g>

    <!-- Field chips -->
    <g v-if="zoneBetTotal('field') > 0">
      <circle
        cx="405"
        cy="282"
        r="16"
        fill="#CC0000"
        stroke="#fff"
        stroke-width="2"
      />
      <text
        x="405"
        y="287"
        class="chip-text"
      >{{ formatChipAmount(zoneBetTotal('field')) }}</text>
    </g>

    <!-- Number box chips -->
    <template
      v-for="(num, idx) in [4, 5, 'six', 8, 'nine', 10]"
      :key="num"
    >
      <g v-if="zoneBetTotal(`place-${num}`) > 0">
        <circle
          :cx="155 + idx * 100"
          cy="75"
          r="14"
          fill="#CC0000"
          stroke="#fff"
          stroke-width="2"
        />
        <text
          :x="155 + idx * 100"
          y="79"
          class="chip-text-sm"
        >
          {{ formatChipAmount(zoneBetTotal(`place-${num}`)) }}
        </text>
      </g>
    </template>

    <!-- Big 6 / Big 8 chips -->
    <g v-if="zoneBetTotal('big-6') > 0">
      <circle
        cx="67"
        cy="50"
        r="12"
        fill="#CC0000"
        stroke="#fff"
        stroke-width="1.5"
      />
      <text
        x="67"
        y="54"
        class="chip-text-xs"
      >{{ formatChipAmount(zoneBetTotal('big-6')) }}</text>
    </g>
    <g v-if="zoneBetTotal('big-8') > 0">
      <circle
        cx="67"
        cy="90"
        r="12"
        fill="#CC0000"
        stroke="#fff"
        stroke-width="1.5"
      />
      <text
        x="67"
        y="94"
        class="chip-text-xs"
      >{{ formatChipAmount(zoneBetTotal('big-8')) }}</text>
    </g>

    <!-- Center prop chips (hardways) -->
    <template
      v-for="(hw, i) in ['hard-4', 'hard-6', 'hard-8', 'hard-10']"
      :key="hw"
    >
      <g v-if="zoneBetTotal(hw) > 0">
        <circle
          :cx="790 + i * 105"
          cy="90"
          r="12"
          fill="#CC0000"
          stroke="#fff"
          stroke-width="1.5"
        />
        <text
          :x="790 + i * 105"
          y="94"
          class="chip-text-xs"
        >{{ formatChipAmount(zoneBetTotal(hw)) }}</text>
      </g>
    </template>

    <!-- Any Seven chip -->
    <g v-if="zoneBetTotal('any-seven') > 0">
      <circle
        cx="950"
        cy="157"
        r="14"
        fill="#CC0000"
        stroke="#fff"
        stroke-width="2"
      />
      <text
        x="950"
        y="161"
        class="chip-text-sm"
      >{{ formatChipAmount(zoneBetTotal('any-seven')) }}</text>
    </g>

    <!-- Any Craps chip -->
    <g v-if="zoneBetTotal('any-craps') > 0">
      <circle
        cx="950"
        cy="217"
        r="14"
        fill="#CC0000"
        stroke="#fff"
        stroke-width="2"
      />
      <text
        x="950"
        y="221"
        class="chip-text-sm"
      >{{ formatChipAmount(zoneBetTotal('any-craps')) }}</text>
    </g>
  </g>
</template>

<style scoped>
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

/* Odds chip label */
.label-odds-chip {
  fill: rgba(255, 255, 255, 0.6);
  font-family: 'Arial', sans-serif;
  font-size: 7px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}
</style>
