<script setup lang="ts">
import type { ActivityEntry } from '../services/api'

defineProps<{
  activityEntries: ActivityEntry[]
}>()

const formatTimeAgo = (iso?: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const getActionColor = (action: string) => {
  const a = action.toLowerCase()
  if (a.includes('error') || a.includes('fail')) return 'text-error'
  if (a.includes('create') || a.includes('start')) return 'text-primary'
  if (a.includes('update') || a.includes('edit')) return 'text-secondary'
  return 'text-on-surface-variant'
}
</script>

<template>
  <div class="bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col h-full overflow-hidden">
    <div class="p-8 border-b border-outline-variant/20 bg-surface-container-highest/20">
      <h1 class="text-2xl font-semibold text-on-surface tracking-tight">Activity Log</h1>
      <p class="text-sm text-on-surface-variant mt-1">Real-time record of system actions and project updates.</p>
    </div>

    <div class="flex-1 overflow-y-auto p-6">
      <div class="space-y-3">
        <div v-for="entry in activityEntries" :key="entry.id"
             class="flex items-center gap-6 p-4 bg-surface-container-highest/30 rounded-xl border border-outline-variant/10 hover:bg-surface-container-highest/50 transition-colors">
          <div class="flex flex-col items-center justify-center w-14">
            <span class="text-[10px] font-bold text-on-surface-variant/60 font-mono tracking-tighter">{{ formatTimeAgo(entry.timestamp) }} ago</span>
          </div>

          <div class="w-24 px-2 py-1 rounded bg-surface/50 border border-outline-variant/10 flex items-center justify-center">
            <span :class="getActionColor(entry.action)" class="text-[10px] font-bold uppercase tracking-widest leading-none">
              {{ entry.action }}
            </span>
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-on-surface truncate">
              {{ entry.projectName || entry.path }}
            </p>
            <p v-if="entry.details" class="text-xs text-on-surface-variant/60 truncate mt-0.5">
              {{ entry.details }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" :class="entry.status === 'error' ? 'bg-error' : 'bg-primary/40'"></span>
          </div>
        </div>

        <div v-if="activityEntries.length === 0" class="h-64 flex flex-col items-center justify-center text-on-surface-variant/40">
          <span class="material-symbols-outlined text-4xl mb-3 opacity-20">history</span>
          <p class="text-sm font-medium">No activity recorded yet</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(var(--primary), 0.1);
  border-radius: 10px;
}
</style>
