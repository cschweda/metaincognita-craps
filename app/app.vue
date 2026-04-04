<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'Craps Simulator',
  description: 'Browser-based casino craps training tool. Learn which bets are mathematically sound and which are sucker bets.'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
