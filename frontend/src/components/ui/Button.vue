<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}>()

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'destructive': return 'bg-red-500 text-white hover:bg-red-500/90'
    case 'outline': return 'border border-gray-200 bg-transparent hover:bg-gray-100 text-gray-900 dark:border-gray-800 dark:text-gray-100 dark:hover:bg-gray-800'
    case 'secondary': return 'bg-gray-100 text-gray-900 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-800/80'
    case 'ghost': return 'hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:text-gray-100 dark:hover:text-gray-50'
    case 'link': return 'text-gray-900 underline-offset-4 hover:underline dark:text-gray-100'
    default: return 'bg-gray-900 text-gray-50 hover:bg-gray-900/90 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-9 px-3 text-xs'
    case 'lg': return 'h-11 px-8'
    case 'icon': return 'h-10 w-10'
    default: return 'h-10 px-4 py-2'
  }
})
</script>

<template>
  <button
    class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-gray-950 dark:focus-visible:ring-gray-300"
    :class="[variantClasses, sizeClasses]"
  >
    <slot />
  </button>
</template>
