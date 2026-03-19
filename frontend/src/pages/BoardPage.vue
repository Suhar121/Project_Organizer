<script setup lang="ts">
import KanbanBoard from '../components/KanbanBoard.vue'
import type { Project } from '../services/api'

defineProps<{
  projects: Project[]
}>()
</script>

<template>
  <div class="h-full">
    <KanbanBoard :projects="projects" />
  </div>
</template>
