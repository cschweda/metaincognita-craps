<script setup lang="ts">
const router = useRouter()

onMounted(() => {
  router.replace('/')
})
</script>

<template>
  <div class="flex-1 bg-neutral-950 flex items-center justify-center">
    <p class="text-neutral-500">
      Redirecting...
    </p>
  </div>
</template>
