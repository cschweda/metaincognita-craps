<script setup lang="ts">
interface Props {
  state: 'ON' | 'OFF'
  point?: number | null
}

withDefaults(defineProps<Props>(), {
  point: null
})
</script>

<template>
  <div
    class="puck flex items-center justify-center rounded-full font-black text-xs leading-none select-none shadow-md"
    :class="state === 'ON'
      ? 'bg-white text-black border-2 border-neutral-300'
      : 'bg-neutral-900 text-white border-2 border-neutral-600'"
    :style="{ width: '40px', height: '40px' }"
    :aria-label="`Puck is ${state}${state === 'ON' && point ? ` on ${point}` : ''}`"
  >
    {{ state }}
  </div>
</template>
