<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}>()

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary': return 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-100'
    case 'destructive': return 'border-transparent bg-red-500 text-gray-50 hover:bg-red-500/80'
    case 'outline': return 'text-gray-950 dark:text-gray-50'
    default: return 'border-transparent bg-gray-900 text-gray-50 hover:bg-gray-900/80 dark:bg-gray-50 dark:text-gray-900'
  }
})
</script>

<template>
  <div
    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:border-gray-800 dark:focus:ring-gray-300"
    :class="[variantClasses]"
  >
    <slot />
  </div>
</template>
