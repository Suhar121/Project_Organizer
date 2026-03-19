<script setup lang="ts">
import { Clock, Play, Code, MoreVertical } from 'lucide-vue-next'
import type { Project } from '../services/api'
import { runProject, openVSCode } from '../services/api'

const props = defineProps<{
  projects: Project[]
  isProjectRunning?: (projectId: string) => boolean
}>()

const emit = defineEmits<{
  (e: 'project-clicked', project: Project): void
  (e: 'action-executed'): void
}>()

const handleRun = async (project: Project) => {
  try {
    await runProject(project.path)
    emit('action-executed')
  } catch (err) {
    console.error('Failed to run project:', err)
  }
}

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
      <h3 class="font-label text-sm font-bold uppercase tracking-widest text-primary">RECENT_OPERATIONS</h3>
      <div class="flex-1 h-px bg-outline-variant/30"></div>
    </div>
    <div class="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
      <div
        v-for="project in projects"
        :key="project.id"
        @click="emit('project-clicked', project)"
        class="min-w-[280px] bg-surface-container p-4 border-l-2 hover:bg-surface-container-high transition-colors group cursor-pointer"
        :class="isProjectRunning?.(project.id) ? 'border-primary-container/30' : 'border-outline-variant'"
      >
        <div class="flex justify-between items-center mb-4">
          <span class="bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-label font-bold uppercase">{{ project.tags?.[0] || 'NODE_JS' }}</span>
          <MoreVertical class="h-3 w-3 text-on-surface-variant" />
        </div>
        <h4 class="font-headline font-black text-primary group-hover:text-primary-container transition-colors uppercase tracking-tight drop-shadow-[0_0_8px_rgba(195,245,255,0.2)]">{{ project.name.replace(/ /g, '_') }}</h4>

        <p class="text-[10px] text-on-surface-variant mt-1 font-mono">Last edited: {{ formatTimeAgo(project.updatedAt) || '2h ago' }}</p>
      </div>
    </div>
  </div>
</template>
