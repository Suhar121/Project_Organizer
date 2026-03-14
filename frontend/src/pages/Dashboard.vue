<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Search, Layers, Moon, Sun, Settings } from 'lucide-vue-next'
import ProjectCard from '../components/ProjectCard.vue'
import AddProjectDialog from '../components/AddProjectDialog.vue'
import Button from '../components/ui/Button.vue'
import Input from '../components/ui/Input.vue'
import { fetchProjects } from '../services/api'
import type { Project } from '../services/api'

const projects = ref<Project[]>([])
const search = ref('')
const tagFilter = ref('')
const isAddDialogOpen = ref(false)
const isDark = ref(true)

const loadProjects = async () => {
  try {
    projects.value = await fetchProjects()
  } catch (error) {
    console.error('Failed to load projects', error)
  }
}

const toggleDark = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

onMounted(() => {
  loadProjects()
  document.documentElement.classList.add('dark')
})

const filteredProjects = computed(() => {
  let result = projects.value

  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(s) || 
      (p.description && p.description.toLowerCase().includes(s))
    )
  }

  if (tagFilter.value) {
    const t = tagFilter.value.toLowerCase()
    result = result.filter(p => p.tags && p.tags.some(tag => tag.toLowerCase() === t))
  }

  return result
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 dark:bg-gray-950 flex font-sans text-gray-900 dark:text-gray-100 transition-colors">
    <!-- Sidebar -->
    <aside class="w-64 border-r bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-col h-screen sticky top-0">
      <div class="h-14 flex items-center px-6 font-bold text-lg border-b dark:border-gray-800 tracking-tight gap-2">
        <Layers class="h-5 w-5 text-blue-500" />
        Local Dash
      </div>
      
      <div class="p-4 flex-1">
        <nav class="space-y-1">
          <Button variant="secondary" class="w-full justify-start text-left font-medium mb-2">
            <Layers class="mr-2 h-4 w-4" />
            All Projects
          </Button>

          <Button variant="ghost" class="w-full justify-start text-left font-medium" @click="isAddDialogOpen = true">
            <Plus class="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </nav>

        <div class="mt-8">
          <h4 class="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">Settings</h4>
          <Button variant="ghost" class="w-full justify-start text-left font-medium" @click="toggleDark">
            <component :is="isDark ? Sun : Moon" class="mr-2 h-4 w-4" />
            {{ isDark ? 'Light' : 'Dark' }} Mode
          </Button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-h-screen">
      <!-- Topbar -->
      <header class="h-14 border-b bg-white dark:bg-gray-900 dark:border-gray-800 flex items-center px-6 justify-between sticky top-0 z-10 shadow-sm">
        <div class="flex items-center flex-1 max-w-md relative">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input 
            v-model="search" 
            placeholder="Search projects... (Ctrl+K)" 
            class="pl-9 bg-gray-50 dark:bg-gray-800 border-none h-9 focus-visible:ring-1" 
          />
        </div>
        <div class="flex items-center gap-4">
          <Button @click="isAddDialogOpen = true" size="sm" class="h-9">
            <Plus class="mr-2 h-4 w-4" /> Add Project
          </Button>
        </div>
      </header>
      
      <!-- Content Area -->
      <div class="p-8 flex-1 overflow-auto">
        <div class="flex justify-between items-end mb-6">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Projects</h1>
            <p class="text-gray-500 mt-1 dark:text-gray-400">Manage and launch your local development environments.</p>
          </div>
        </div>

        <div v-if="filteredProjects.length === 0" class="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed dark:border-gray-800 bg-white dark:bg-gray-900 border-gray-200">
          <Layers class="h-10 w-10 text-gray-400 mb-4" />
          <h2 class="text-lg font-semibold mb-2">No projects found</h2>
          <p class="text-gray-500 max-w-sm mb-4">You haven't added any projects yet, or none match your search criteria.</p>
          <Button @click="isAddDialogOpen = true">Add your first project</Button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProjectCard 
            v-for="project in filteredProjects" 
            :key="project.id" 
            :project="project"
            @deleted="loadProjects" 
          />
        </div>
      </div>
    </main>

    <AddProjectDialog v-model:open="isAddDialogOpen" @added="loadProjects" />
  </div>
</template>
