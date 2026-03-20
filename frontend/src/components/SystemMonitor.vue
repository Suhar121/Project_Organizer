<script setup lang="ts">
import type { SystemOverview } from '../services/api'

defineProps<{
  systemOverview: SystemOverview | null
}>()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="bg-surface border border-outline-variant/30 rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
      <div class="flex justify-between items-start mb-6">
        <div class="space-y-1">
          <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">CPU Load</span>
          <p class="text-[10px] text-tertiary font-medium">Optimal Performance</p>
        </div>
        <div class="p-2 bg-primary/10 rounded-lg">
          <span class="material-symbols-outlined text-primary text-xl">speed</span>
        </div>
      </div>
      <div class="flex items-baseline gap-2 mb-4">
        <h2 class="text-4xl font-bold text-on-surface tracking-tight">{{ systemOverview?.cpuUsagePercent ?? '0.0' }}</h2>
        <span class="text-lg text-on-surface-variant font-medium">%</span>
      </div>
      <div class="h-2 bg-surface-container-highest w-full rounded-full overflow-hidden">
        <div class="h-full bg-primary rounded-full transition-all duration-1000" :style="{ width: `${systemOverview?.cpuUsagePercent ?? 0}%` }"></div>
      </div>
    </div>

    <div class="bg-surface border border-outline-variant/30 rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
      <div class="flex justify-between items-start mb-6">
        <div class="space-y-1">
          <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Memory Usage</span>
          <p class="text-[10px] text-on-surface-variant font-medium">Total: {{ systemOverview?.memory?.totalGb ?? '0' }} GB</p>
        </div>
        <div class="p-2 bg-secondary/10 rounded-lg">
          <span class="material-symbols-outlined text-secondary text-xl">memory</span>
        </div>
      </div>
      <div class="flex items-baseline gap-2 mb-4">
        <h2 class="text-4xl font-bold text-on-surface tracking-tight">{{ systemOverview?.memory?.usedGb ?? '0.0' }}</h2>
        <span class="text-lg text-on-surface-variant font-medium">GB</span>
      </div>
      <div class="h-2 bg-surface-container-highest w-full rounded-full overflow-hidden">
        <div class="h-full bg-secondary rounded-full transition-all duration-1000" :style="{ width: `${systemOverview?.memory?.usagePercent ?? 0}%` }"></div>
      </div>
    </div>
  </div>
</template>
