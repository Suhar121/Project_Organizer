<script setup lang="ts">
import { ref } from 'vue'
import { Play, Code, FolderOpen, Trash2, Pin, PinOff, Edit, GitBranch, Terminal } from 'lucide-vue-next'
import Card from './ui/Card.vue'
import CardHeader from './ui/CardHeader.vue'
import CardTitle from './ui/CardTitle.vue'
import CardDescription from './ui/CardDescription.vue'
import CardContent from './ui/CardContent.vue'
import CardFooter from './ui/CardFooter.vue'
import Badge from './ui/Badge.vue'
import Button from './ui/Button.vue'
import CommandLogPanel from './CommandLogPanel.vue'
import { runProject, openVSCode, openFolder, deleteProject, updateProject } from '../services/api'
import type { Project } from '../services/api'

const props = defineProps<{
  project: Project
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
    alert('Failed to update pin status')
  }
}

const handleStart = async () => {
  try {
    await runProject(props.project.path)
    alert(`Started project: ${props.project.name}`)
  } catch (error) {
    console.error(error)
    alert('Failed to start project')
  }
}

const handleOpenVSCode = async () => {
  try {
    await openVSCode(props.project.path)
  } catch (error) {
    console.error(error)
  }
}

const handleOpenFolder = async () => {
  try {
    await openFolder(props.project.path)
  } catch (error) {
    console.error(error)
  }
}

const logPanel = ref({ open: false, commandId: '', commandLabel: '' })

const looksDangerous = (command: string) => {
  return /(rm|del|drop|format|shutdown)/i.test(command)
}

const handleRunSavedCommand = (commandId: string, label: string, command: string) => {
  if (looksDangerous(command)) {
    const ok = confirm(`This command may be risky:\n${command}\n\nRun anyway?`)
    if (!ok) return
  }
  logPanel.value = { open: true, commandId, commandLabel: label }
}
</script>

<template>
  <Card class="flex flex-col h-full group relative" :class="project.isPinned ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : ''">
    
    <div class="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <button
        @click="togglePin"
        :class="project.isPinned ? 'text-blue-500 hover:text-blue-600' : 'text-gray-400 hover:text-blue-500'"
        :title="project.isPinned ? 'Unpin Project' : 'Pin Project'"
      >
        <PinOff v-if="project.isPinned" class="h-4 w-4" />
        <Pin v-else class="h-4 w-4" />
      </button>

      <button
        @click="emit('edit', project)"
        class="text-gray-400 hover:text-green-500"
        title="Edit Project"
      >
        <Edit class="h-4 w-4" />
      </button>

      <button
        @click="handleDelete"
        class="text-gray-400 hover:text-red-500"
        title="Remove Project"
      >
        <Trash2 class="h-4 w-4" />
      </button>
    </div>

    <CardHeader class="pt-6">
      <div class="flex items-center gap-2 pr-16 text-left">
        <span class="inline-flex h-2 w-2 flex-shrink-0 rounded-full font-bold" :class="project.status === 'running' ? 'bg-green-500' : 'bg-gray-300'"></span>
        <CardTitle class="truncate">{{ project.name }}</CardTitle>
      </div>
      <CardDescription class="mt-2">{{ project.description || 'No description provided.' }}</CardDescription>
    </CardHeader>

    <CardContent class="flex-1">
      <div class="space-y-4">
        <div>
          <p class="text-xs text-muted-foreground font-mono truncate" :title="project.path">
            {{ project.path }}
          </p>
        </div>

        <div v-if="project.git?.isGitRepo" class="flex flex-wrap gap-2">
          <Badge variant="outline" class="inline-flex items-center gap-1">
            <GitBranch class="h-3 w-3" />
            {{ project.git.branch || 'detached' }}
          </Badge>
          <Badge v-if="project.git.hasUncommittedChanges" variant="secondary">Uncommitted</Badge>
          <Badge v-if="project.git.needsPush" variant="secondary">Needs Push</Badge>
        </div>
        
        <div class="flex flex-wrap gap-2" v-if="project.tags && project.tags.length > 0">
          <Badge v-for="tag in project.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
        </div>

        <div v-if="project.commands && project.commands.length > 0" class="space-y-1.5">
          <p class="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Terminal class="h-3 w-3" /> Quick Run
          </p>
          <div class="flex flex-wrap gap-1.5">
            <Button
              v-for="cmd in project.commands.slice(0, 3)"
              :key="cmd.id"
              size="sm"
              variant="outline"
              class="h-7 px-2 text-xs gap-1"
              @click="handleRunSavedCommand(cmd.id, cmd.label, cmd.command)"
              :title="cmd.workingDir ? `${cmd.command}  (dir: ${cmd.workingDir})` : cmd.command"
            >
              <Play class="h-2.5 w-2.5" />
              {{ cmd.label }}
            </Button>
            <span v-if="project.commands.length > 3" class="text-xs text-muted-foreground self-center">+{{ project.commands.length - 3 }} more</span>
          </div>
        </div>
      </div>
    </CardContent>

    <CardFooter class="flex flex-wrap gap-2 mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
      <Button size="sm" @click="handleStart" class="w-full sm:w-auto flex-1">
        <Play class="mr-2 h-4 w-4" /> Start
      </Button>
      <Button size="icon" variant="outline" @click="handleOpenVSCode" title="Open in VS Code">
        <Code class="h-4 w-4" />
      </Button>
      <Button size="icon" variant="outline" @click="handleOpenFolder" title="Open Folder">
        <FolderOpen class="h-4 w-4" />
      </Button>
    </CardFooter>
  </Card>

  <CommandLogPanel
    :open="logPanel.open"
    :project-id="project.id"
    :command-id="logPanel.commandId"
    :command-label="logPanel.commandLabel"
    @close="logPanel.open = false"
  />
</template>
