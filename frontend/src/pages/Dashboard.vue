<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  Plus,
  Search,
  Layers,
  RefreshCw,
} from 'lucide-vue-next'
import ProjectCard from '../components/ProjectCard.vue'
import AddProjectDialog from '../components/AddProjectDialog.vue'
import EditProjectDialog from '../components/EditProjectDialog.vue'
import CommandPalette from '../components/CommandPalette.vue'
import RecentProjectsBar from '../components/RecentProjectsBar.vue'
import ProjectStatsCard from '../components/ProjectStatsCard.vue'
import SystemMonitor from '../components/SystemMonitor.vue'
import PortManager from '../components/PortManager.vue'
import NotesPage from './NotesPage.vue'
import ActivityPage from './ActivityPage.vue'
import VaultPage from './VaultPage.vue'
import BoardPage from './BoardPage.vue'
import Button from '../components/ui/Button.vue'

import {
  fetchProjects,
  fetchSystemOverview,
  fetchPorts,
  fetchActivity,
  killProcess
} from '../services/api'
import type {
  Project,
  SystemOverview,
  PortEntry,
  ActivityEntry
} from '../services/api'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { useRecentProjects } from '../composables/useRecentProjects'
import { useRunningProcesses } from '../composables/useRunningProcesses'

type TodoStatus = 'todo' | 'doing' | 'done'
type AppPage = 'dashboard' | 'notes' | 'activity' | 'vault' | 'kanban'

type TodoItem = {
  id: string
  title: string
  status: TodoStatus
}

type VaultSecret = {
  id: string
  label: string
  value: string
  note?: string
}

const SCRATCHPAD_STORAGE_KEY = 'dev-dashboard.scratchpad'
const TODOS_STORAGE_KEY = 'dev-dashboard.todos'
const VAULT_SALT_KEY = 'dev-dashboard.vault.salt'
const VAULT_VERIFIER_KEY = 'dev-dashboard.vault.verifier'

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

const activePage = ref<AppPage>('dashboard')
const projects = ref<Project[]>([])
const search = ref('')
const tagFilter = ref('')
const isAddDialogOpen = ref(false)
const isEditDialogOpen = ref(false)
const projectToEdit = ref<Project | null>(null)

const systemOverview = ref<SystemOverview | null>(null)
const ports = ref<PortEntry[]>([])
const activityEntries = ref<ActivityEntry[]>([])
const isSystemLoading = ref(false)
const isPortsLoading = ref(false)
const isActivityLoading = ref(false)
const portSearch = ref('')

const isKillingPort = ref<Record<number, boolean>>({})

const handleKillProcess = async (pid: number, port: number) => {
  if (!confirm(`Are you sure you want to kill the process on port ${port} (PID: ${pid})?`)) return
  isKillingPort.value[port] = true
  try {
    await killProcess(pid)
    setTimeout(loadPorts, 500)
    setTimeout(loadPorts, 2000)
  } catch (error) {
    console.error('Failed to kill process', error)
  } finally {
    isKillingPort.value[port] = false
  }
}

const scratchpad = ref('')
const todos = ref<TodoItem[]>([])
const vaultHasSetup = ref(false)
const vaultIsUnlocked = ref(false)
const vaultError = ref('')
const vaultUnlockPassword = ref('')
const vaultSecrets = ref<VaultSecret[]>([])
const visibleSecretIds = ref<Record<string, boolean>>({})
let vaultKey: CryptoKey | null = null

let refreshHandle: number | null = null
const hasLoadedDashboardData = ref(false)
const hasLoadedActivityData = ref(false)

const isCommandPaletteOpen = ref(false)

const { recentProjects } = useRecentProjects(activityEntries, projects, 8)
const { isProjectRunning, getRunningCount, refresh: refreshRunningProcesses } = useRunningProcesses(5000)

useKeyboardShortcuts({
  'ctrl+k': () => { isCommandPaletteOpen.value = true }
})

const loadProjects = async () => {
  try {
    projects.value = await fetchProjects()
  } catch (error) {
    console.error('Failed to load projects', error)
  }
}

const loadSystemOverview = async () => {
  isSystemLoading.value = true
  try {
    systemOverview.value = await fetchSystemOverview()
  } catch (error) {
    console.error('Failed to load system overview', error)
  } finally {
    isSystemLoading.value = false
  }
}

const loadPorts = async () => {
  isPortsLoading.value = true
  try {
    const { ports: portList } = await fetchPorts()
    ports.value = portList
  } catch (error) {
    console.error('Failed to load ports', error)
  } finally {
    isPortsLoading.value = false
  }
}

const loadActivity = async () => {
  isActivityLoading.value = true
  try {
    const { entries } = await fetchActivity()
    activityEntries.value = entries.slice(0, 30)
  } catch (error) {
    console.error('Failed to load activity', error)
  } finally {
    isActivityLoading.value = false
  }
}

const refreshOpsData = async () => {
  if (document.hidden) return
  if (activePage.value === 'dashboard') {
    await Promise.all([loadSystemOverview(), loadPorts(), loadProjects()])
  } else if (activePage.value === 'activity') {
    await loadActivity()
  }
}

const openEditDialog = (project: Project) => {
  projectToEdit.value = project
  isEditDialogOpen.value = true
}

const availableTags = computed(() => {
  const tags = new Set<string>()
  projects.value.forEach(project => {
    project.tags?.forEach(tag => tags.add(tag))
  })
  return Array.from(tags).sort()
})

const toggleTagFilter = (tag: string) => {
  tagFilter.value = tagFilter.value === tag ? '' : tag
}

const filteredProjects = computed(() => {
  let result = projects.value
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)))
  }
  if (tagFilter.value) {
    const targetTag = tagFilter.value.toLowerCase()
    result = result.filter(p => p.tags?.some(t => t.toLowerCase() === targetTag))
  }
  return result.sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1))
})

const filteredPorts = computed(() => {
  if (!portSearch.value.trim()) return ports.value
  const q = portSearch.value.toLowerCase()
  return ports.value.filter(e => String(e.port).includes(q) || e.processName.toLowerCase().includes(q) || (e.projectName && e.projectName.toLowerCase().includes(q)))
})

// Persistence logic
const saveTodos = () => localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos.value))
const addTodo = (title: string) => {
  todos.value.unshift({ id: Date.now().toString(), title, status: 'todo' })
  saveTodos()
}
const moveTodo = (todo: TodoItem, status: TodoStatus) => {
  todo.status = status
  saveTodos()
}
const removeTodo = (id: string) => {
  todos.value = todos.value.filter(t => t.id !== id)
  saveTodos()
}
const saveScratchpad = (val: string) => {
  scratchpad.value = val
  localStorage.setItem(SCRATCHPAD_STORAGE_KEY, val)
}

// Vault logic placeholders
const deriveMaterial = async (password: string, salt: Uint8Array) => {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )

  return { key, verifier: btoa(String.fromCharCode(...new Uint8Array(bits))) }
}

const unlockVault = async () => {
  vaultError.value = ''
  const saltRaw = localStorage.getItem(VAULT_SALT_KEY)
  const verifier = localStorage.getItem(VAULT_VERIFIER_KEY)
  if (!saltRaw || !verifier) return

  const salt = new Uint8Array(atob(saltRaw).split('').map(c => c.charCodeAt(0)))
  const { key, verifier: newVerifier } = await deriveMaterial(vaultUnlockPassword.value, salt)

  if (newVerifier === verifier) {
    vaultKey = key
    vaultIsUnlocked.value = true
  } else {
    vaultError.value = 'Invalid master key.'
  }
}

const lockVault = () => {
  vaultKey = null
  vaultIsUnlocked.value = false
  vaultUnlockPassword.value = ''
}

const addVaultSecret = (label: string, value: string) => {
  vaultSecrets.value.push({
    id: Date.now().toString(),
    label,
    value
  })
}

const removeVaultSecret = (id: string) => {
  vaultSecrets.value = vaultSecrets.value.filter(s => s.id !== id)
}

const toggleSecretVisibility = (id: string) => {
  visibleSecretIds.value[id] = !visibleSecretIds.value[id]
}

const initializeVault = () => {
  vaultHasSetup.value = !!localStorage.getItem(VAULT_SALT_KEY)
}

onMounted(() => {
  scratchpad.value = localStorage.getItem(SCRATCHPAD_STORAGE_KEY) || ''
  const t = localStorage.getItem(TODOS_STORAGE_KEY)
  if (t) try { todos.value = JSON.parse(t) } catch {}

  initializeVault()
  refreshOpsData()
  refreshHandle = window.setInterval(refreshOpsData, 60000)
})

onBeforeUnmount(() => { if (refreshHandle) clearInterval(refreshHandle) })

watch(activePage, (page) => {
  if (page === 'dashboard' && !hasLoadedDashboardData.value) {
    refreshOpsData()
    hasLoadedDashboardData.value = true
  } else if (page === 'activity' && !hasLoadedActivityData.value) {
    loadActivity()
    hasLoadedActivityData.value = true
  }
})
</script>

<template>
  <div class="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-surface text-on-surface font-body selection:bg-primary/30 pb-20 md:pb-0">
    <header class="flex justify-between items-center w-full px-6 py-4 bg-[#0b1326] border-l-4 border-primary sticky top-0 z-50">
      <div class="flex items-center gap-4">
        <span class="material-symbols-outlined text-primary">terminal</span>
        <h1 class="text-xl font-bold text-primary tracking-tighter font-headline uppercase italic">TACTICAL_OS</h1>
        <nav class="hidden lg:flex items-center gap-8 ml-8">
          <button @click="activePage = 'dashboard'" :class="[activePage === 'dashboard' ? 'text-primary' : 'text-on-surface-variant hover:text-primary', 'font-headline text-xs font-bold uppercase tracking-widest transition-colors']">DASHBOARD</button>
          <button @click="activePage = 'kanban'" :class="[activePage === 'kanban' ? 'text-primary' : 'text-on-surface-variant hover:text-primary', 'font-headline text-xs font-bold uppercase tracking-widest transition-colors']">KANBAN</button>
          <button @click="activePage = 'notes'" :class="[activePage === 'notes' ? 'text-primary' : 'text-on-surface-variant hover:text-primary', 'font-headline text-xs font-bold uppercase tracking-widest transition-colors']">GLOBAL_NOTES</button>
          <button @click="activePage = 'activity'" :class="[activePage === 'activity' ? 'text-primary' : 'text-on-surface-variant hover:text-primary', 'font-headline text-xs font-bold uppercase tracking-widest transition-colors']">ACTIVITY_LOG</button>
          <button @click="activePage = 'vault'" :class="[activePage === 'vault' ? 'text-primary' : 'text-on-surface-variant hover:text-primary', 'font-headline text-xs font-bold uppercase tracking-widest transition-colors']">SECRET_VAULT</button>
        </nav>
      </div>

      <div class="hidden md:flex flex-1 max-w-xl mx-8">
        <div class="relative w-full group">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input v-model="search" class="w-full bg-surface-container-highest border-l-2 border-transparent focus:border-primary px-10 py-2 font-label text-xs uppercase tracking-wider text-on-surface outline-none transition-all placeholder:text-outline/50" placeholder="GLOBAL_SEARCH [CTRL+K]" type="text"/>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button @click="isAddDialogOpen = true" class="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 font-headline uppercase tracking-[0.05rem] text-sm font-bold active:scale-95 transition-colors hover:bg-primary-container">
          <span class="material-symbols-outlined text-sm">add_box</span> NEW_PROJECT
        </button>
        <button @click="refreshOpsData" class="p-2 text-primary hover:bg-primary/10 transition-colors">
          <RefreshCw class="h-5 w-5" :class="isSystemLoading ? 'animate-spin' : ''" />
        </button>
      </div>
    </header>

    <main class="p-6 space-y-8 max-w-[1600px] mx-auto w-full">
      <template v-if="activePage === 'dashboard'">
        <section class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SystemMonitor :system-overview="systemOverview" class="md:col-span-2" />
          <ProjectStatsCard v-if="projects.length > 0" :projects="projects" :activity-entries="activityEntries" :running-count="getRunningCount()" class="md:col-span-2" />
        </section>

        <RecentProjectsBar v-if="recentProjects.length > 0" :projects="recentProjects" :is-project-running="isProjectRunning" @action-executed="loadProjects(); loadActivity(); refreshRunningProcesses()" @project-clicked="(p) => { search = p.name }" />

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section class="lg:col-span-2 space-y-4">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3"><span class="material-symbols-outlined text-primary">folder_open</span><h3 class="font-label text-sm font-bold uppercase tracking-widest text-on-surface">PROJECT_LIBRARY</h3></div>
              <div v-if="availableTags.length > 0" class="flex gap-2">
                <button v-for="tag in availableTags" :key="tag" @click="toggleTagFilter(tag)" class="bg-surface-container-highest px-3 py-1 text-[9px] font-label font-bold uppercase transition-colors" :class="tagFilter === tag ? 'text-primary border-b border-primary' : 'text-on-surface-variant hover:text-primary'">{{ tag }}</button>
              </div>
            </div>

            <div v-if="filteredProjects.length === 0" class="bg-surface-container-low p-12 text-center border border-dashed border-outline-variant"><span class="material-symbols-outlined text-4xl text-outline-variant mb-4">inventory_2</span><p class="font-label text-sm uppercase text-on-surface-variant">NO_MATCHING_PROJECTS_FOUND</p></div>
            <div class="space-y-3">
              <ProjectCard v-for="project in filteredProjects" :key="project.id" :project="project" :is-running="isProjectRunning(project.id)" @deleted="loadProjects" @updated="loadProjects" @edit="openEditDialog" />
            </div>
          </section>

          <aside class="space-y-8">
            <PortManager :filtered-ports="filteredPorts" :is-killing-port="isKillingPort" @kill-process="handleKillProcess" />

            <section class="bg-surface-container-highest p-4 space-y-2">
              <div class="flex items-center justify-between"><span class="text-[10px] font-label font-bold text-on-surface-variant uppercase">SYSTEM_LOGS_PREVIEW</span><span class="flex h-2 w-2 rounded-full" :class="isActivityLoading ? 'bg-secondary animate-pulse' : 'bg-primary'"></span></div>
              <div class="font-mono text-[10px] space-y-1 text-on-surface-variant opacity-80 overflow-y-auto max-h-40 hide-scrollbar">
                <p v-for="entry in activityEntries.slice(0, 10)" :key="entry.id" :class="entry.status === 'error' ? 'text-error' : 'text-primary/70'">[{{ formatTimeAgo(entry.timestamp) }}] {{ entry.action.toUpperCase() }}: {{ entry.projectName || entry.path }}</p>
              </div>
            </section>
          </aside>
        </div>
      </template>

      <template v-else-if="activePage === 'notes'">
        <NotesPage
          :scratchpad="scratchpad"
          :todos="todos"
          @update:scratchpad="saveScratchpad"
          @add-todo="addTodo"
          @move-todo="moveTodo"
          @remove-todo="removeTodo"
        />
      </template>

      <template v-else-if="activePage === 'activity'">
        <ActivityPage :activity-entries="activityEntries" />
      </template>

      <template v-else-if="activePage === 'vault'">
        <VaultPage
          v-model:vault-unlock-password="vaultUnlockPassword"
          :vault-is-unlocked="vaultIsUnlocked"
          :vault-secrets="vaultSecrets"
          :visible-secret-ids="visibleSecretIds"
          @unlock="unlockVault"
          @lock="lockVault"
          @add-secret="addVaultSecret"
          @remove-secret="removeVaultSecret"
          @toggle-visibility="toggleSecretVisibility"
        />
      </template>

      <template v-else-if="activePage === 'kanban'">
        <BoardPage :projects="projects" />
      </template>
    </main>

    <footer class="p-6 border-t border-outline-variant/10 flex justify-between items-center text-outline-variant text-[10px] font-label uppercase tracking-widest mt-auto">
      <span>NODE_ID: PX-992-BETA</span>
      <div class="flex gap-8"><span>v2.4.1 (STABLE)</span></div>
    </footer>

    <AddProjectDialog v-model:open="isAddDialogOpen" @added="loadProjects" />
    <EditProjectDialog v-model:open="isEditDialogOpen" :project="projectToEdit" @updated="loadProjects" />
    <CommandPalette v-model:open="isCommandPaletteOpen" :projects="projects" @action-executed="loadProjects(); loadActivity(); refreshRunningProcesses()" />
  </div>
</template>
