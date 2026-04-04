<script setup lang="ts">
interface Props {
  amount: number
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: '#dc2626'
})

const displayAmount = computed(() => {
  const dollars = props.amount / 100
  if (dollars >= 1000) return `${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}k`
  if (dollars >= 1) return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`
  return `${props.amount}c`
})
</script>

<template>
  <div
    class="bet-chip relative flex items-center justify-center rounded-full select-none"
    :style="{
      width: '32px',
      height: '32px',
      backgroundColor: color,
      border: '2px dashed rgba(255,255,255,0.4)',
      boxShadow: '0 3px 6px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1) inset'
    }"
  >
    <span class="text-[8px] font-bold text-white drop-shadow-sm leading-none">
      {{ displayAmount }}
    </span>
  </div>
</template>
