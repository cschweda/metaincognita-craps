<script setup lang="ts">
import type { BetResolution, TableRules } from '~/utils/betTypes'
import type { TutorialStep } from '~/utils/tutorial'
import { fillTutorialText } from '~/utils/tutorial'

const props = defineProps<{
  step: TutorialStep
  index: number
  total: number
  rules: TableRules
  /** The hero's results from the last roll, shown when the step asks for them. */
  results: BetResolution[]
}>()

defineEmits<{
  next: []
  exit: []
}>()

const isLast = computed(() => props.index === props.total - 1)
const waitsForPlayer = computed(() => props.step.task.kind !== 'next')
const fill = (text: string) => fillTutorialText(text, props.rules)

// Each new step is announced, and Continue takes focus so Enter moves on.
const continueButton = ref<{ $el?: HTMLElement } | null>(null)
watch(() => props.index, () => {
  nextTick(() => {
    const el = continueButton.value?.$el
    if (el instanceof HTMLElement) el.focus({ preventScroll: true })
  })
})
</script>

<template>
  <section
    class="tutorial-card mx-2 mt-2 rounded-xl border border-amber-500/50 bg-neutral-900/95 shadow-lg shadow-black/40 shrink-0"
    aria-label="Tutorial"
  >
    <div class="flex items-center justify-between gap-3 px-4 pt-2.5">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-[10px] font-bold uppercase tracking-widest text-amber-400 shrink-0">
          Tutorial · {{ index + 1 }} / {{ total }}
        </span>
        <div
          class="hidden sm:block h-1 w-28 rounded bg-neutral-800 overflow-hidden"
          aria-hidden="true"
        >
          <div
            class="h-full bg-amber-400 transition-all duration-300"
            :style="{ width: (((index + 1) / total) * 100) + '%' }"
          />
        </div>
      </div>
      <button
        type="button"
        class="text-[11px] text-neutral-500 hover:text-neutral-300 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
        @click="$emit('exit')"
      >
        Exit tutorial
      </button>
    </div>

    <div
      class="px-4 pb-3 pt-1 max-h-[38vh] overflow-y-auto"
      aria-live="polite"
    >
      <h2 class="text-base font-bold text-neutral-100">
        {{ step.title }}
      </h2>
      <p
        v-for="(para, i) in step.body"
        :key="i"
        class="text-sm text-neutral-300 leading-snug mt-1"
      >
        {{ fill(para) }}
      </p>

      <ul
        v-if="step.showResults && results.length > 0"
        class="mt-2 flex flex-wrap gap-1.5"
      >
        <li
          v-for="res in results"
          :key="res.betId"
          class="rounded px-2 py-0.5 text-xs font-mono"
          :class="{
            'bg-emerald-900/40 text-emerald-300': res.outcome === 'win',
            'bg-red-900/40 text-red-300': res.outcome === 'lose',
            'bg-neutral-800 text-neutral-300': res.outcome === 'push'
          }"
        >
          {{ res.description }}:
          {{ res.outcome === 'win' ? '+' + formatCents(res.netGain) : res.outcome === 'lose' ? formatCents(res.netGain) : 'push' }}
        </li>
      </ul>

      <div class="mt-2.5 flex flex-wrap items-center gap-3">
        <p class="text-sm font-semibold text-amber-300 flex items-center gap-1.5">
          <span
            v-if="waitsForPlayer"
            class="inline-block w-2 h-2 rounded-full bg-amber-400 tutorial-dot"
            aria-hidden="true"
          />
          {{ fill(step.action) }}
        </p>
        <UButton
          v-if="!waitsForPlayer"
          ref="continueButton"
          size="sm"
          color="warning"
          :label="isLast ? 'Start playing' : 'Continue'"
          class="font-bold"
          @click="$emit('next')"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.tutorial-dot {
  animation: tutorial-dot 1.2s ease-in-out infinite;
}

@keyframes tutorial-dot {
  50% { opacity: 0.25; }
}

@media (prefers-reduced-motion: reduce) {
  .tutorial-dot {
    animation: none;
  }
}
</style>
