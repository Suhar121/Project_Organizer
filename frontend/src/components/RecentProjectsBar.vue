<script setup lang="ts">
import { MoreVertical } from 'lucide-vue-next'
import type { Project } from '../services/api'

const props = defineProps<{
  projects: Project[]
  isProjectRunning?: (projectId: string) => boolean
}>()

const emit = defineEmits<{
  (e: 'project-clicked', project: Project): void
  (e: 'action-executed'): void
}>()

const formatTimeAgo = (iso?: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
</script>

<template>
  <div v-if="projects.length > 0" class="space-y-4">
    <div class="flex items-center gap-4 mb-4">
      <h3 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Recent Operations</h3>
      <div class="flex-1 h-px bg-outline-variant/10"></div>
    </div>
    <div class="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
      <div
        v-for="project in projects"
        :key="project.id"
        @click="emit('project-clicked', project)"
        class="min-w-[280px] bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 hover:bg-surface-container transition-all group cursor-pointer shadow-sm hover:shadow-md"
      >
        <div class="flex justify-between items-center mb-4">
          <span class="bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-tight">
            {{ project.tags?.[0] || 'Node.js' }}
          </span>
          <div class="p-1 rounded-full hover:bg-surface-container-highest transition-colors">
            <MoreVertical class="h-3 w-3 text-on-surface-variant/40" />
          </div>
        </div>
        <h4 class="text-lg font-semibold text-on-surface group-hover:text-primary transition-colors tracking-tight">{{ project.name }}</h4>
        <p class="text-[10px] text-on-surface-variant/60 mt-1 font-medium italic">Updated: {{ formatTimeAgo(project.updatedAt) || 'Just now' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
