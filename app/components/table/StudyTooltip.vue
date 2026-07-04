<script setup lang="ts">
import { zoneDescriptions } from '~/utils/zoneDescriptions'

const props = defineProps<{
  zoneId: string
  x: number
  y: number
  hasBetAmount: number
  disabled: boolean
  gamePhase: string
}>()

/** Context-aware study explanation for this zone */
const explanation = computed((): { title: string, body: string, status: string, edge: string } | null => {
  const info = zoneDescriptions[props.zoneId]
  if (!info) return null

  const hasBet = props.hasBetAmount > 0
  const phase = props.gamePhase

  let status = ''
  if (hasBet) {
    status = `You have ${formatChipAmount(props.hasBetAmount)} on this bet.`
  } else if (props.disabled) {
    if (phase === 'COME_OUT' && ['come', 'dont-come', 'come-odds', 'dont-come-odds'].includes(props.zoneId)) {
      status = 'Only available during the point phase.'
    } else if (phase === 'POINT_PHASE' && ['pass-line', 'dont-pass'].includes(props.zoneId)) {
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
})
</script>

<template>
  <div
    v-if="explanation"
    class="study-tooltip"
    :style="{
      left: Math.min(x + 16, 800) + 'px',
      top: (y - 10) + 'px'
    }"
  >
    <div class="study-tooltip-title">
      {{ explanation.title }}
    </div>
    <div class="study-tooltip-edge">
      House edge: {{ explanation.edge }}
    </div>
    <div class="study-tooltip-body">
      {{ explanation.body }}
    </div>
    <div class="study-tooltip-status">
      {{ explanation.status }}
    </div>
  </div>
</template>

<style scoped>
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
