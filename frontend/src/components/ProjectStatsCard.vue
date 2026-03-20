<script setup lang="ts">
import { computed } from 'vue'
import { Info } from 'lucide-vue-next'

import type { Project, ActivityEntry } from '../services/api'

const props = defineProps<{
  projects: Project[]
  activityEntries: ActivityEntry[]
  runningCount: number
}>()

const totalProjects = computed(() => props.projects.length)

const uncommittedCount = computed(() =>
  props.projects.filter(p => p.git?.hasUncommittedChanges).length
)

const activityLast24h = computed(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  return props.activityEntries.filter(
    entry => new Date(entry.timestamp).getTime() > cutoff
  ).length
})

const sparklineData = computed(() => {
  const days = 7
  const buckets: number[] = Array(days).fill(0)
  const now = Date.now()

  for (const entry of props.activityEntries) {
    const age = now - new Date(entry.timestamp).getTime()
    const dayIndex = Math.floor(age / (24 * 60 * 60 * 1000))
    if (dayIndex >= 0 && dayIndex < days) {
      const idx = days - 1 - dayIndex;
      buckets[idx] = (buckets[idx] || 0) + 1
    }
  }

  return buckets
})

const maxSparklineValue = computed(() => Math.max(...sparklineData.value, 1))
</script>

<template>
  <div class="bg-surface border border-outline-variant/30 rounded-2xl p-6 relative overflow-hidden group flex flex-col shadow-sm hover:shadow-md transition-all">
    <div class="flex justify-between items-center mb-8">
      <div class="flex items-center gap-2.5">
        <div class="p-1.5 bg-tertiary/10 rounded-lg">
          <Info class="h-4 w-4 text-tertiary" />
        </div>
        <span class="text-sm font-bold text-on-surface tracking-tight">Ecosystem Metrics</span>
      </div>
      <div class="flex gap-1">
        <span class="h-1 w-1 rounded-full bg-primary"></span>
        <span class="h-1 w-1 rounded-full bg-secondary"></span>
        <span class="h-1 w-1 rounded-full bg-tertiary"></span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-y-8 gap-x-12 mb-auto">
      <div class="space-y-1">
        <span class="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Total Projects</span>
        <span class="text-3xl font-bold text-on-surface tracking-tighter">{{ totalProjects }}</span>
      </div>
      <div class="space-y-1">
        <span class="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Active Tasks</span>
        <span class="text-3xl font-bold text-primary tracking-tighter">{{ runningCount || 0 }}</span>
      </div>
      <div class="space-y-1">
        <span class="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Git Status (Dirty)</span>
        <span class="text-3xl font-bold text-secondary tracking-tighter">{{ uncommittedCount }}</span>
      </div>
      <div class="space-y-1">
        <span class="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Ops (24h)</span>
        <span class="text-3xl font-bold text-on-surface tracking-tighter">{{ activityLast24h }}</span>
      </div>
    </div>

    <div class="mt-10 pt-6 border-t border-outline-variant/10">
      <div class="flex justify-between items-end mb-4">
        <span class="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Activity Frequency (7d)</span>
        <span class="text-[10px] font-bold text-primary">Peak: {{ maxSparklineValue }}</span>
      </div>
      <div class="flex items-end gap-1.5 h-10">
        <div
          v-for="(val, idx) in sparklineData"
          :key="idx"
          class="flex-1 bg-surface-container-low rounded-t-md h-full relative overflow-hidden transition-all duration-300 group-hover:bg-surface-container"
          :title="`${val} events`"
        >
          <div class="absolute bottom-0 left-0 w-full bg-primary/20 group-hover:bg-primary transition-all duration-700 ease-out rounded-t-sm"
               :style="{ height: `${val > 0 ? (val / maxSparklineValue) * 100 : 10}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>
