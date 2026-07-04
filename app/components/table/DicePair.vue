<script setup lang="ts">
const props = defineProps<{
  die1: number | null
  die2: number | null
  rolling: boolean
}>()

// During the roll animation, show rapidly changing random faces
const animDie1 = ref(1)
const animDie2 = ref(1)
let intervalId: ReturnType<typeof setInterval> | null = null

watch(() => props.rolling, (isRolling) => {
  if (isRolling) {
    // Rapidly cycle random faces during roll
    intervalId = setInterval(() => {
      animDie1.value = Math.floor(Math.random() * 6) + 1
      animDie2.value = Math.floor(Math.random() * 6) + 1
    }, 60)
  } else {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

// What to display: during rolling show random faces, otherwise show actual values
const showDie1 = computed(() => props.rolling ? animDie1.value : (props.die1 ?? 1))
const showDie2 = computed(() => props.rolling ? animDie2.value : (props.die2 ?? 1))
const hasResult = computed(() => props.die1 != null && props.die2 != null)
const total = computed(() => (props.die1 ?? 0) + (props.die2 ?? 0))

// Pip positions for each face (true = show pip at that grid position)
// Grid: 3x3 → [TL, TC, TR, ML, MC, MR, BL, BC, BR]
const pips: Record<number, boolean[]> = {
  1: [false, false, false, false, true, false, false, false, false],
  2: [false, false, true, false, false, false, true, false, false],
  3: [false, false, true, false, true, false, true, false, false],
  4: [true, false, true, false, false, false, true, false, true],
  5: [true, false, true, false, true, false, true, false, true],
  6: [true, false, true, true, false, true, true, false, true]
}
</script>

<template>
  <div class="flex flex-col items-center gap-1.5">
    <div class="flex items-center gap-4">
      <!-- Die 1 -->
      <div
        class="die"
        :class="{ shaking: props.rolling }"
      >
        <span
          v-for="(show, i) in pips[showDie1]"
          :key="i"
          class="pip-cell"
        >
          <span
            v-if="show"
            class="pip"
          />
        </span>
      </div>

      <!-- Die 2 -->
      <div
        class="die"
        :class="{ shaking: props.rolling }"
        style="animation-delay: 0.05s"
      >
        <span
          v-for="(show, i) in pips[showDie2]"
          :key="i"
          class="pip-cell"
        >
          <span
            v-if="show"
            class="pip"
          />
        </span>
      </div>
    </div>

    <!-- Total badge -->
    <div
      v-if="hasResult && !props.rolling"
      class="px-3 py-0.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 text-black font-bold text-sm shadow-lg shadow-amber-500/30 min-w-[2.5rem] text-center"
    >
      {{ total }}
    </div>
    <div
      v-else-if="props.rolling"
      class="px-3 py-0.5 rounded-full bg-neutral-700 text-neutral-400 font-bold text-sm min-w-[2.5rem] text-center animate-pulse"
    >
      ...
    </div>
  </div>
</template>

<style scoped>
.die {
  width: 52px;
  height: 52px;
  background: linear-gradient(145deg, #ffffff, #e8e8e8);
  border: 2px solid #aaa;
  border-radius: 10px;
  box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.8);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 6px;
  box-sizing: border-box;
}

.pip-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #ef4444, #991b1b);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Shake animation during roll */
.shaking {
  animation: shake 0.1s infinite;
}

@keyframes shake {
  0%   { transform: translate(0, 0) rotate(0deg); }
  25%  { transform: translate(-3px, 2px) rotate(-4deg); }
  50%  { transform: translate(2px, -2px) rotate(3deg); }
  75%  { transform: translate(-2px, -1px) rotate(-2deg); }
  100% { transform: translate(3px, 1px) rotate(4deg); }
}
</style>
