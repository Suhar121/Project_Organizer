<script setup lang="ts">
const props = defineProps<{
  for?: string
}>()
</script>

<template>
  <label
    :for="props.for"
    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-100"
  >
    <slot />
  </label>
</template>
