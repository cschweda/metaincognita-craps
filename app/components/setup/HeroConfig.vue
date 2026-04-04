<script setup lang="ts">
import { sanitizeName } from '~/utils/sanitize'
import { formatCents } from '~/utils/format'

const props = defineProps<{
  name: string
  bankroll: number
  defaultBankroll: number
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:bankroll': [value: number]
}>()

const minBankroll = computed(() => Math.round(props.defaultBankroll * 0.5))
const maxBankroll = computed(() => props.defaultBankroll * 5)

function onNameInput(value: string) {
  emit('update:name', sanitizeName(value))
}

function onBankrollChange(value: number | undefined) {
  if (value !== undefined) emit('update:bankroll', value)
}

// Re-clamp bankroll when stake changes
watch(() => props.defaultBankroll, () => {
  const clamped = Math.min(Math.max(props.bankroll, minBankroll.value), maxBankroll.value)
  if (clamped !== props.bankroll) {
    emit('update:bankroll', clamped)
  }
})
</script>

<template>
  <div class="space-y-5">
    <h2 class="text-lg font-semibold text-amber-400 tracking-wide uppercase">
      Your Player
    </h2>

    <UFormField label="Name">
      <UInput
        :model-value="name"
        placeholder="Hero"
        maxlength="32"
        icon="i-lucide-user"
        class="w-full"
        @update:model-value="onNameInput($event as string)"
      />
    </UFormField>

    <UFormField label="Bankroll">
      <div class="flex items-center gap-4">
        <USlider
          :model-value="bankroll"
          :min="minBankroll"
          :max="maxBankroll"
          :step="defaultBankroll >= 100000 ? 10000 : defaultBankroll >= 10000 ? 5000 : 1000"
          color="primary"
          class="flex-1"
          @update:model-value="onBankrollChange"
        />
        <span class="text-emerald-400 font-mono text-lg min-w-[6rem] text-right">
          {{ formatCents(bankroll) }}
        </span>
      </div>
      <p class="text-xs text-neutral-500 mt-1">
        {{ formatCents(minBankroll) }} - {{ formatCents(maxBankroll) }}
      </p>
    </UFormField>
  </div>
</template>
