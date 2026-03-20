<script setup lang="ts">
import { ref } from 'vue'
import { Play, Trash2, Pin, PinOff, Edit, GitBranch, Terminal, Database, Cloud, History } from 'lucide-vue-next'

import { deleteProject, updateProject } from '../services/api'
import type { Project, ProjectCommand } from '../services/api'
import CommandLogPanel from './CommandLogPanel.vue'

const props = defineProps<{
  project: Project
  isRunning?: boolean
}>()

const emit = defineEmits<{
  (e: 'deleted', id: string): void
  (e: 'updated', id: string): void
  (e: 'edit', project: Project): void
}>()

const handleDelete = async () => {
  if (confirm(`Are you sure you want to remove "${props.project.name}" from the dashboard?`)) {
    try {
      await deleteProject(props.project.id)
      emit('deleted', props.project.id)
    } catch (error) {
      console.error(error)
      alert('Failed to delete project')
    }
  }
}

const togglePin = async () => {
  try {
    await updateProject(props.project.id, { isPinned: !props.project.isPinned })
    emit('updated', props.project.id)
  } catch (error) {
    console.error(error)
  }
}

const logPanel = ref({ open: false, commandId: '', commandLabel: '' })

const handleStart = () => {
  logPanel.value = {
    open: true,
    commandId: '__default__',
    commandLabel: 'START_PROTOCOL'
  }
}

const handleRunCommand = (cmd: ProjectCommand) => {
  logPanel.value = {
    open: true,
    commandId: cmd.id,
    commandLabel: cmd.label
  }
}
</script>

<template>
  <div class="bg-surface-container-low/80 backdrop-blur-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group relative overflow-hidden border-l-2 hover:border-r-2 transition-all duration-300" :class="isRunning ? 'border-primary shadow-[0_0_15px_rgba(195,245,255,0.1)]' : 'border-outline-variant'">

    <div class="flex items-center gap-4">
      <div class="w-10 h-10 bg-surface-container-highest flex items-center justify-center">
        <Database v-if="project.tags?.includes('database')" class="h-5 w-5 text-secondary" />
        <Cloud v-else-if="project.tags?.includes('infra')" class="h-5 w-5 text-primary" />

        <Terminal v-else class="h-5 w-5 text-primary" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h5 class="font-headline font-black text-primary uppercase tracking-tight text-sm drop-shadow-[0_0_8px_rgba(195,245,255,0.2)]">{{ project.name }}</h5>

          <span v-if="isRunning" class="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 font-label font-bold">ACTIVE</span>
          <span v-else class="bg-surface-container-highest text-on-surface-variant text-[9px] px-1.5 py-0.5 font-label font-bold">IDLE</span>
          <button @click="togglePin" class="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Pin v-if="!project.isPinned" class="h-3 w-3 text-outline hover:text-primary" />
            <PinOff v-else class="h-3 w-3 text-primary" />
          </button>
        </div>
        <p v-if="project.description" class="text-[11px] text-on-surface-variant font-body mt-1 mb-1 line-clamp-1 pr-4 max-w-sm">{{ project.description }}</p>
        <div class="flex items-center gap-3 mt-1">
          <div v-if="project.git?.isGitRepo" class="flex items-center gap-1 text-[10px] font-mono text-on-surface-variant">
            <GitBranch class="h-3 w-3" />
            {{ project.git.branch || 'detached' }}
          </div>
          <div v-if="project.git?.isGitRepo" class="flex items-center gap-1 text-[10px] font-mono text-on-surface-variant">
            <History class="h-3 w-3" />
            {{ project.git.lastCommitHash?.slice(0, 7) || '-------' }}
          </div>
          <div class="text-[10px] text-on-surface-variant/70 truncate max-w-[200px] font-mono tracking-tight" :title="project.path">
            {{ project.path }}
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
      <template v-if="project.commands && project.commands.length > 0">
        <button
          v-for="cmd in project.commands"
          :key="cmd.id"
          @click="handleRunCommand(cmd)"
          class="p-2 bg-surface-container hover:bg-primary/10 hover:text-primary transition-all active:scale-95 flex items-center gap-1 group/btn"
          :class="isRunning ? 'text-primary' : 'text-on-surface-variant'"
          :title="`Run: ${cmd.label}`"
        >
          <Play class="h-4 w-4" />
          <span class="text-[9px] font-bold uppercase tracking-wider hidden group-hover/btn:block whitespace-nowrap">{{ cmd.label }}</span>
        </button>
      </template>
      <button
        v-else
        @click="handleStart"
        class="p-2 bg-surface-container hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
        :class="isRunning ? 'text-primary' : 'text-on-surface-variant'"
        :title="isRunning ? 'Running' : 'Start Process'"
      >
        <Play class="h-4 w-4" />
      </button>
      <button @click="emit('edit', project)" class="p-2 bg-surface-container hover:bg-primary/10 hover:text-primary transition-all active:scale-95 text-on-surface-variant">
        <Edit class="h-4 w-4" />
      </button>
      <button @click="handleDelete" class="p-2 bg-surface-container hover:bg-error/10 hover:text-error transition-all active:scale-95 text-on-surface-variant">
        <Trash2 class="h-4 w-4" />
      </button>
    </div>

    <CommandLogPanel
      :open="logPanel.open"
      :project-id="project.id"
      :command-id="logPanel.commandId"
      :command-label="logPanel.commandLabel"
      @close="logPanel.open = false"
    />
  </div>
</template>
