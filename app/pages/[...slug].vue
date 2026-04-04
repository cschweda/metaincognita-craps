<script setup lang="ts">
const router = useRouter()

onMounted(() => {
  router.replace('/')
})
</script>

<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center">
    <p class="text-neutral-500">Redirecting...</p>
  </div>
</template>
