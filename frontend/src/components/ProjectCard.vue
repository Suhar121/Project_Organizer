<script setup lang="ts">
import { Play, Code, FolderOpen, Trash2 } from 'lucide-vue-next'
import Card from './ui/Card.vue'
import CardHeader from './ui/CardHeader.vue'
import CardTitle from './ui/CardTitle.vue'
import CardDescription from './ui/CardDescription.vue'
import CardContent from './ui/CardContent.vue'
import CardFooter from './ui/CardFooter.vue'
import Badge from './ui/Badge.vue'
import Button from './ui/Button.vue'
import { runProject, openVSCode, openFolder, deleteProject } from '../services/api'
import type { Project } from '../services/api'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  (e: 'deleted', id: string): void
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
</script>

<template>
  <Card class="flex flex-col h-full group relative">
    <button 
      @click="handleDelete" 
      class="absolute right-4 top-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      title="Remove Project"
    >
      <Trash2 class="h-4 w-4" />
    </button>
    <CardHeader>
      <div class="flex items-center justify-between pr-6">
        <CardTitle>{{ project.name }}</CardTitle>
        <span class="inline-flex h-2 w-2 rounded-full font-bold" :class="project.status === 'running' ? 'bg-green-500' : 'bg-gray-300'"></span>
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
        
        <div class="flex flex-wrap gap-2" v-if="project.tags && project.tags.length > 0">
          <Badge v-for="tag in project.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
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
</template>
