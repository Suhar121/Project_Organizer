<script setup lang="ts">
import { computed } from 'vue'
import { PlayCircle, GitBranch, Activity, Info } from 'lucide-vue-next'

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
  <div class="bg-surface-container-low p-6 relative overflow-hidden border border-outline-variant/10 group flex flex-col">
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-2">
        <Info class="h-3 w-3 text-outline" />
        <span class="font-label text-xs font-bold uppercase tracking-widest text-on-surface">SYSTEM_METRICS</span>
      </div>
      <span class="h-1.5 w-1.5 rounded-full bg-outline-variant/50"></span>
    </div>

    <div class="grid grid-cols-2 gap-y-6 gap-x-12 mb-auto">
      <div>
        <span class="block text-[9px] font-label text-on-surface-variant uppercase tracking-widest mb-1">PROJECT_TOTAL</span>
        <span class="text-3xl font-headline font-black text-on-surface">{{ totalProjects }}</span>
      </div>
      <div>
        <span class="block text-[9px] font-label text-on-surface-variant uppercase tracking-widest mb-1">PROCESS_ACTIVE</span>
        <span class="text-3xl font-headline font-black text-on-surface">{{ runningCount || 0 }}</span>
      </div>
      <div>
        <span class="block text-[9px] font-label text-on-surface-variant uppercase tracking-widest mb-1">GIT_DIRTY_STATE</span>
        <span class="text-3xl font-headline font-black text-secondary">{{ uncommittedCount }}</span>
      </div>
      <div>
        <span class="block text-[9px] font-label text-on-surface-variant uppercase tracking-widest mb-1">OPS_LAST_24H</span>
        <span class="text-3xl font-headline font-black text-on-surface">{{ activityLast24h }}</span>
      </div>
    </div>

    <div class="mt-8 border-t border-outline-variant/10 pt-4">
      <span class="block text-[9px] font-label text-on-surface-variant uppercase tracking-widest mb-4">ACTIVITY_WAVEFORM_7D</span>
      <div class="flex items-end gap-1 h-6">
        <div
          v-for="(val, idx) in sparklineData"
          :key="idx"
          class="flex-1 bg-outline-variant/30 h-full relative overflow-hidden group-hover:bg-outline-variant/40 transition-colors"
        >
          <div class="absolute bottom-0 left-0 w-full bg-primary/40 group-hover:bg-primary transition-all duration-500 ease-out"
               :style="{ height: `${val > 0 ? (val / maxSparklineValue) * 100 : 5}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>
