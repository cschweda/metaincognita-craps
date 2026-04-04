<script setup lang="ts">
const store = useCrapsStore()

const callKey = ref(0)

// Increment key on each new call to restart the fade animation
watch(() => store.stickmanCall, () => {
  if (store.stickmanCall) {
    callKey.value++
  }
})

const colorClass = computed(() => {
  switch (store.stickmanCallType) {
    case 'natural': return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/80'
    case 'craps': return 'text-red-400 border-red-500/40 bg-red-950/80'
    case 'winner': return 'text-amber-400 border-amber-500/40 bg-amber-950/80'
    case 'sevenout': return 'text-red-400 border-red-500/40 bg-red-950/80'
    case 'point': return 'text-blue-400 border-blue-500/40 bg-blue-950/80'
    case 'neutral': return 'text-neutral-200 border-neutral-500/40 bg-neutral-900/80'
    default: return 'text-neutral-200 border-neutral-500/40 bg-neutral-900/80'
  }
})
</script>

<template>
  <div
    v-if="store.stickmanCall"
    :key="callKey"
    class="stickman-call pointer-events-none px-5 py-2 rounded-lg border backdrop-blur-sm text-center font-bold text-lg tracking-wide shadow-xl"
    :class="colorClass"
  >
    {{ store.stickmanCall }}
  </div>
</template>

<style scoped>
.stickman-call {
  animation: stickman-fade 3s ease-in-out forwards;
}

@keyframes stickman-fade {
  0% {
    opacity: 0;
    transform: translateY(4px) scale(0.95);
  }
  8% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
