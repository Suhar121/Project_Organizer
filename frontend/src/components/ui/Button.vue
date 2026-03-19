<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}>()

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'destructive': return 'bg-error text-on-error hover:bg-error/90'
    case 'outline': return 'border border-outline bg-transparent hover:bg-surface-variant text-on-surface'
    case 'secondary': return 'bg-secondary text-on-secondary hover:bg-secondary/90'
    case 'ghost': return 'hover:bg-surface-variant text-on-surface'
    case 'link': return 'text-primary underline-offset-4 hover:underline'
    default: return 'bg-primary text-on-primary hover:bg-primary-container'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-8 px-4 text-[10px]'
    case 'lg': return 'h-11 px-8 text-sm'
    case 'icon': return 'h-10 w-10'
    default: return 'h-10 px-6 py-2 text-sm'
  }
})
</script>

<template>
  <button
    class="relative inline-flex items-center justify-center whitespace-nowrap rounded-none font-['Space_Grotesk'] font-bold uppercase tracking-[0.05rem] transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-primary"
    :class="[variantClasses, sizeClasses]"
  >
    <span class="truncate flex items-center justify-center gap-2 max-w-full">
      <slot />
    </span>
  </button>
</template>
