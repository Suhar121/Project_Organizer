<script setup lang="ts">
import type { SystemOverview } from '../services/api'

defineProps<{
  systemOverview: SystemOverview | null
}>()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="bg-surface-container-low p-6 relative overflow-hidden group">
      <div class="absolute top-0 left-0 w-1 h-full bg-primary"></div>
      <div class="flex justify-between items-start mb-4 text-on-surface-variant">
        <span class="font-label text-xs uppercase tracking-widest">CPU_LOAD</span>
        <span class="material-symbols-outlined text-primary text-xl">speed</span>
      </div>
      <div class="flex items-baseline gap-2">
        <h2 class="font-headline text-4xl font-black text-primary tracking-tighter">{{ systemOverview?.cpuUsagePercent ?? '0.0' }}</h2>
        <span class="font-headline text-lg text-primary/60">%</span>
      </div>
      <div class="mt-4 h-1 bg-surface-container-highest w-full">
        <div class="h-full bg-primary" :style="{ width: `${systemOverview?.cpuUsagePercent ?? 0}%` }"></div>
      </div>
      <div class="mt-2 font-label text-[10px] text-on-surface-variant uppercase">
        <span>CORE_STABILITY: OPTIMAL</span>
      </div>
    </div>

    <div class="bg-surface-container-low p-6 relative overflow-hidden group">
      <div class="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
      <div class="flex justify-between items-start mb-4 text-on-surface-variant">
        <span class="font-label text-xs uppercase tracking-widest">MEMORY</span>
        <span class="material-symbols-outlined text-secondary text-xl">memory</span>
      </div>
      <div class="flex items-baseline gap-2">
        <h2 class="font-headline text-4xl font-black text-secondary tracking-tighter">{{ systemOverview?.memory?.usedGb ?? '0.0' }}</h2>
        <span class="font-headline text-lg text-secondary/60">GB</span>
      </div>
      <div class="mt-4 h-1 bg-surface-container-highest w-full">
        <div class="h-full bg-secondary" :style="{ width: `${systemOverview?.memory?.usagePercent ?? 0}%` }"></div>
      </div>
      <div class="mt-2 font-label text-[10px] text-on-surface-variant uppercase">
        <span>TOTAL: {{ systemOverview?.memory?.totalGb ?? '0' }} GB</span>
      </div>
    </div>
  </div>
</template>
