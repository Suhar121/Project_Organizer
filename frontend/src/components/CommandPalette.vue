<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Search, Play, Code, FolderOpen, Terminal, ArrowRight } from 'lucide-vue-next'
import type { Project } from '../services/api'
import { runProject, openVSCode, openFolder, runProjectCommand } from '../services/api'

const props = defineProps<{
  open: boolean
  projects: Project[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'action-executed'): void
}>()

type PaletteItem = {
  id: string
  type: 'project' | 'command' | 'action'
  label: string
  sublabel?: string
  projectId?: string
  projectPath?: string
  commandId?: string
  action?: 'run' | 'vscode' | 'folder' | 'run-command'
}

const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement>()

// Build searchable items from projects and their commands
const allItems = computed<PaletteItem[]>(() => {
  const items: PaletteItem[] = []

  for (const project of props.projects) {
    // Project actions
    items.push({
      id: `${project.id}-run`,
      type: 'action',
      label: `Run ${project.name}`,
      sublabel: project.path,
      projectId: project.id,
      projectPath: project.path,
      action: 'run'
    })
    items.push({
      id: `${project.id}-vscode`,
      type: 'action',
      label: `Open ${project.name} in VS Code`,
      sublabel: project.path,
      projectId: project.id,
      projectPath: project.path,
      action: 'vscode'
    })
    items.push({
      id: `${project.id}-folder`,
      type: 'action',
      label: `Open ${project.name} folder`,
      sublabel: project.path,
      projectId: project.id,
      projectPath: project.path,
      action: 'folder'
    })

    // Project commands
    if (project.commands) {
      for (const cmd of project.commands) {
        items.push({
          id: `${project.id}-cmd-${cmd.id}`,
          type: 'command',
          label: `${project.name}: ${cmd.label}`,
          sublabel: cmd.command,
          projectId: project.id,
          projectPath: project.path,
          commandId: cmd.id,
          action: 'run-command'
        })
      }
    }
  }

  return items
})

const filteredItems = computed(() => {
  if (!query.value.trim()) return allItems.value.slice(0, 10)

  const q = query.value.toLowerCase()
  return allItems.value
    .filter(item =>
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q))
    )
    .slice(0, 15)
})

// Reset state when opened
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    query.value = ''
    selectedIndex.value = 0
    nextTick(() => inputRef.value?.focus())
  }
})

// Clamp selection when filtered list changes
watch(filteredItems, (items) => {
  if (selectedIndex.value >= items.length) {
    selectedIndex.value = Math.max(0, items.length - 1)
  }
})

const close = () => emit('update:open', false)

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filteredItems.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = filteredItems.value[selectedIndex.value]
    if (item) executeItem(item)

  } else if (e.key === 'Escape') {
    close()
  }
}

const executeItem = async (item: PaletteItem) => {
  if (!item) return

  try {
    if (item.action === 'run' && item.projectPath) {
      await runProject(item.projectPath)
    } else if (item.action === 'vscode' && item.projectPath) {
      await openVSCode(item.projectPath)
    } else if (item.action === 'folder' && item.projectPath) {
      await openFolder(item.projectPath)
    } else if (item.action === 'run-command' && item.projectId && item.commandId) {
      await runProjectCommand(item.projectId, { commandId: item.commandId })
    }
    emit('action-executed')
  } catch (err) {
    console.error('Command palette action failed:', err)
  }

  close()
}

const getIcon = (item: PaletteItem) => {
  if (item.action === 'run') return Play
  if (item.action === 'vscode') return Code
  if (item.action === 'folder') return FolderOpen
  if (item.action === 'run-command') return Terminal
  return ArrowRight
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-black/60"
      @click="close"
    >
      <div
        class="fixed left-1/2 top-[15%] w-full max-w-xl -translate-x-1/2 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 shadow-2xl overflow-hidden"
        @click.stop
      >
        <!-- Search Input -->
        <div class="flex items-center border-b dark:border-gray-700 px-4">
          <Search class="h-5 w-5 text-gray-400" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Search projects, commands..."
            class="flex-1 bg-transparent py-4 px-3 text-sm outline-none placeholder:text-gray-400"
            @keydown="handleKeydown"
          />
          <kbd class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500">esc</kbd>
        </div>

        <!-- Results List -->
        <div class="max-h-80 overflow-y-auto py-2">
          <div
            v-for="(item, idx) in filteredItems"
            :key="item.id"
            class="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors"
            :class="idx === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'"
            @click="executeItem(item)"
            @mouseenter="selectedIndex = idx"
          >
            <component :is="getIcon(item)" class="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ item.label }}</p>
              <p v-if="item.sublabel" class="text-xs text-gray-500 truncate">{{ item.sublabel }}</p>
            </div>
            <ArrowRight v-if="idx === selectedIndex" class="h-4 w-4 text-blue-500" />
          </div>

          <p v-if="filteredItems.length === 0" class="px-4 py-6 text-center text-sm text-gray-500">
            No results found
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
