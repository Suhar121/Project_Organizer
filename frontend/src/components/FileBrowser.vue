<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Folder, File, ChevronRight, Home, Code } from 'lucide-vue-next'
import { fetchProjectFiles, openVSCode } from '../services/api'
import type { FileEntry } from '../services/api'

const props = defineProps<{
  projectId: string
  projectPath: string
}>()

const files = ref<FileEntry[]>([])
const currentPath = ref('')
const isLoading = ref(false)
const error = ref('')

const loadFiles = async (subPath: string = '') => {
  isLoading.value = true
  error.value = ''
  try {
    const data = await fetchProjectFiles(props.projectId, subPath)
    if (data.isDirectory && data.files) {
      files.value = data.files.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
        return a.isDirectory ? -1 : 1
      })
      currentPath.value = subPath
    }
  } catch (err) {
    error.value = 'Failed to load directory.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

const navigateTo = (newSubPath: string) => {
  loadFiles(newSubPath)
}

const navigateUp = () => {
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  navigateTo(parts.join('/'))
}

const openInVSCode = async () => {
  try {
    await openVSCode(props.projectPath)
  } catch (err) {
    console.error('Failed to open VS Code:', err)
  }
}

watch(() => props.projectId, () => loadFiles(''))
onMounted(() => loadFiles(''))
</script>

<template>
  <div class="bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col h-[500px] overflow-hidden shadow-sm">
    <div class="p-4 border-b border-outline-variant/20 bg-surface-container-highest/30 flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs font-mono text-on-surface-variant overflow-hidden">
        <button @click="navigateTo('')" class="hover:text-primary transition-colors flex items-center gap-1">
          <Home class="h-3 w-3" />
          ROOT
        </button>
        <template v-for="(part, i) in currentPath.split('/').filter(Boolean)" :key="i">
          <ChevronRight class="h-3 w-3 opacity-30" />
          <button @click="navigateTo(currentPath.split('/').slice(0, i+1).join('/'))" class="hover:text-primary truncate">
            {{ part }}
          </button>
        </template>
      </div>
      <div class="flex gap-2">
        <button @click="openInVSCode" class="p-2 rounded-lg hover:bg-surface-container-highest transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
          <Code class="h-3.5 w-3.5" />
          VS CODE
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="isLoading" class="h-full flex items-center justify-center opacity-50">
        <span class="material-symbols-outlined animate-spin text-primary">sync</span>
      </div>
      <div v-else-if="error" class="p-4 text-error text-xs italic">{{ error }}</div>
      <div v-else class="space-y-0.5">
        <button
          v-if="currentPath"
          @click="navigateUp"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-highest transition-colors text-xs text-on-surface-variant"
        >
          <ChevronRight class="h-4 w-4 rotate-180 opacity-40" />
          ..
        </button>

        <div
          v-for="file in files" :key="file.path"
          class="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-container-highest transition-colors cursor-pointer"
          @click="file.isDirectory ? navigateTo(file.path) : null"
        >
          <div class="flex items-center gap-3 text-xs overflow-hidden">
            <component :is="file.isDirectory ? Folder : File" class="h-4 w-4 shrink-0" :class="file.isDirectory ? 'text-primary/70' : 'text-on-surface-variant/50'" />
            <span class="truncate" :class="file.isDirectory ? 'font-semibold text-on-surface' : 'text-on-surface-variant'">{{ file.name }}</span>
          </div>
          <div class="flex items-center gap-4 text-[10px] text-on-surface-variant/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <span v-if="!file.isDirectory">{{ (file.size / 1024).toFixed(1) }} KB</span>
            <span class="font-mono">{{ new Date(file.mtime).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
