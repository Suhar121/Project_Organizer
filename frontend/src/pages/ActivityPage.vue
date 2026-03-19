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
</script>

<template>
  <div class="bg-surface-container-low p-8 border-l-4 border-primary">
    <h1 class="font-headline text-3xl font-bold text-primary uppercase italic tracking-tighter mb-8">GLOBAL_ACTIVITY_LOG</h1>
    <div class="space-y-2">
      <div v-for="entry in activityEntries" :key="entry.id" class="flex items-center gap-4 py-2 border-b border-outline-variant/10 text-xs font-mono">
        <span class="text-outline-variant w-20">[{{ formatTimeAgo(entry.timestamp) }}]</span>
        <span :class="entry.status === 'error' ? 'text-error' : 'text-primary'" class="font-bold w-32 uppercase">[{{ entry.action }}]</span>
        <span class="text-on-surface truncate flex-1">{{ entry.projectName || entry.path }}</span>
      </div>
    </div>
  </div>
</template>
