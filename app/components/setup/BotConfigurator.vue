<script setup lang="ts">
import { crapsConfig } from '~~/craps.config'

interface BotEntry {
  name: string
  strategy: string
}

const props = defineProps<{
  bots: BotEntry[]
}>()

const emit = defineEmits<{
  'update:bots': [value: BotEntry[]]
}>()

const strategies = crapsConfig.botStrategies
const strategyItems = strategies.map(s => ({ label: s.name, value: s.system }))

const botCount = computed({
  get: () => props.bots.length,
  set: (n: number | number[]) => {
    const count = Array.isArray(n) ? n[0]! : n
    if (count === props.bots.length) return
    if (count < props.bots.length) {
      emit('update:bots', props.bots.slice(0, count))
    } else {
      const added: BotEntry[] = []
      for (let i = props.bots.length; i < count; i++) {
        const strat = strategies[i % strategies.length]!
        added.push({ name: strat.name, strategy: strat.system })
      }
      emit('update:bots', [...props.bots, ...added])
    }
  }
})

function updateStrategy(index: number, system: string) {
  const persona = strategies.find(s => s.system === system)
  const updated = props.bots.map((b, i) =>
    i === index ? { name: persona?.name ?? b.name, strategy: system } : b
  )
  emit('update:bots', updated)
}

function randomizeAll() {
  const shuffled = [...strategies].sort(() => Math.random() - 0.5)
  const updated = props.bots.map((_, i) => {
    const strat = shuffled[i % shuffled.length]!
    return { name: strat.name, strategy: strat.system }
  })
  emit('update:bots', updated)
}

function clearAll() {
  emit('update:bots', [])
}

function onCountChange(value: number | undefined) {
  if (value !== undefined) botCount.value = value
}
</script>

<template>
  <div class="space-y-5">
    <h2 class="text-lg font-semibold text-amber-400 tracking-wide uppercase">
      Other Players
    </h2>

    <div class="flex items-center gap-4">
      <USlider
        :model-value="botCount"
        :min="0"
        :max="7"
        :step="1"
        color="primary"
        class="flex-1"
        @update:model-value="onCountChange"
      />
      <span class="text-neutral-300 font-mono text-sm min-w-[5rem] text-right">
        {{ botCount }} bot{{ botCount === 1 ? '' : 's' }}
      </span>
    </div>

    <div v-if="bots.length > 0" class="space-y-3">
      <div class="flex gap-2">
        <UButton
          size="xs"
          color="neutral"
          variant="outline"
          icon="i-lucide-shuffle"
          label="Randomize All"
          @click="randomizeAll"
        />
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          label="Clear All"
          @click="clearAll"
        />
      </div>

      <div
        v-for="(bot, i) in bots"
        :key="i"
        class="flex items-center gap-3 rounded-lg bg-neutral-800/50 border border-neutral-700 px-3 py-2"
      >
        <span class="text-neutral-500 text-xs font-mono w-5">{{ i + 1 }}</span>
        <span class="text-neutral-300 text-sm font-medium min-w-[10rem]">{{ bot.name }}</span>
        <USelect
          :model-value="bot.strategy"
          :items="strategyItems"
          size="sm"
          class="flex-1"
          @update:model-value="updateStrategy(i, $event as string)"
        />
      </div>
    </div>
  </div>
</template>
