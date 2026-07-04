<script setup lang="ts">
const store = useCrapsStore()

const chipDenominations = computed(() => store.chipDenominations)

const chipColors: Record<number, string> = {
  100: '#ffffff', // $1 white
  500: '#dc2626', // $5 red
  2500: '#16a34a', // $25 green
  10000: '#1a1a1a', // $100 black
  50000: '#7c3aed', // $500 purple
  100000: '#ea580c', // $1000 orange
  500000: '#6b7280' // $5000 gray
}

const chipTextColors: Record<number, string> = {
  100: '#1a1a1a',
  500: '#ffffff',
  2500: '#ffffff',
  10000: '#ffffff',
  50000: '#ffffff',
  100000: '#ffffff',
  500000: '#ffffff'
}

function getChipColor(cents: number): string {
  return chipColors[cents] ?? '#6b7280'
}

function getTextColor(cents: number): string {
  return chipTextColors[cents] ?? '#ffffff'
}

function selectChip(value: number) {
  store.setSelectedChip(value)
}
</script>

<template>
  <div class="chip-tray flex items-center justify-center gap-3 py-1.5 px-4">
    <span class="text-neutral-400 text-xs font-medium uppercase tracking-wider mr-2">Chips</span>
    <button
      v-for="denom in chipDenominations"
      :key="denom"
      class="chip-button relative flex items-center justify-center rounded-full transition-all duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
      :class="{
        'ring-2 ring-amber-400 ring-offset-2 ring-offset-neutral-900 scale-110 shadow-lg': store.selectedChipValue === denom,
        'shadow-md hover:shadow-lg': store.selectedChipValue !== denom
      }"
      :style="{
        width: '52px',
        height: '52px',
        backgroundColor: getChipColor(denom),
        color: getTextColor(denom),
        border: `3px dashed ${store.selectedChipValue === denom ? '#fbbf24' : 'rgba(255,255,255,0.3)'}`
      }"
      :aria-label="`Select ${formatCents(denom)} chip`"
      @click="selectChip(denom)"
    >
      <span class="text-xs font-bold leading-none">{{ formatCents(denom) }}</span>
    </button>
  </div>
</template>
