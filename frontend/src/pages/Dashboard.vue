<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  Plus,
  Search,
  Layers,
  Moon,
  Sun,
  Tag,
  Cpu,
  MemoryStick,
  Network,
  RefreshCw,
  ExternalLink,
  ClipboardList,
  NotebookPen,
  Palette,
  Activity,
  ArrowRight,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  Pencil,
  Trash2,
  X,
  RefreshCcw,
  GitBranch,
  History
} from 'lucide-vue-next'
import ProjectCard from '../components/ProjectCard.vue'
import AddProjectDialog from '../components/AddProjectDialog.vue'
import EditProjectDialog from '../components/EditProjectDialog.vue'
import CommandPalette from '../components/CommandPalette.vue'
import RecentProjectsBar from '../components/RecentProjectsBar.vue'
import ProjectStatsCard from '../components/ProjectStatsCard.vue'
import Button from '../components/ui/Button.vue'
import Input from '../components/ui/Input.vue'
import Badge from '../components/ui/Badge.vue'
import Card from '../components/ui/Card.vue'
import CardHeader from '../components/ui/CardHeader.vue'
import CardTitle from '../components/ui/CardTitle.vue'
import CardContent from '../components/ui/CardContent.vue'
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

type Bookmark = {
  name: string
  url: string
  category: string
}

type TodoStatus = 'todo' | 'doing' | 'done'
type AppPage = 'dashboard' | 'notes' | 'activity' | 'vault'

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

const BOOKMARKS_STORAGE_KEY = 'dev-dashboard.bookmarks'
const SCRATCHPAD_STORAGE_KEY = 'dev-dashboard.scratchpad'
const TODOS_STORAGE_KEY = 'dev-dashboard.todos'
const THEME_STORAGE_KEY = 'dev-dashboard.theme'
const ACCENT_STORAGE_KEY = 'dev-dashboard.accent'
const PROJECT_GROUPS_COLLAPSE_KEY = 'dev-dashboard.groups.collapsed'
const VAULT_SALT_KEY = 'dev-dashboard.vault.salt'
const VAULT_VERIFIER_KEY = 'dev-dashboard.vault.verifier'
const VAULT_DATA_KEY = 'dev-dashboard.vault.data'

const defaultBookmarks: Bookmark[] = [
  { name: 'Docker Desktop', url: 'http://localhost:8888', category: 'infra' },
  { name: 'pgAdmin', url: 'http://localhost:5050', category: 'database' },
  { name: 'phpMyAdmin', url: 'http://localhost/phpmyadmin', category: 'database' },
  { name: 'MongoDB Compass Docs', url: 'https://www.mongodb.com/docs/compass', category: 'docs' }
]

const gitDirtyCount = computed(() => projects.value.filter(p => !!p.git?.isGitRepo && Math.random() > 0.5).length) // Mocking dirty state for demo
const opsLast24h = computed(() => activityEntries.value.length || 0)

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

const bookmarks = ref<Bookmark[]>([])
const scratchpad = ref('')
const todos = ref<TodoItem[]>([])
const newTodoTitle = ref('')

const vaultHasSetup = ref(false)
const vaultIsUnlocked = ref(false)
const vaultError = ref('')
const vaultSetupPassword = ref('')
const vaultSetupConfirm = ref('')
const vaultUnlockPassword = ref('')
const vaultSecrets = ref<VaultSecret[]>([])
const vaultLabel = ref('')
const vaultValue = ref('')
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
const addTodo = () => {
  if (!newTodoTitle.value.trim()) return
  todos.value.unshift({ id: Date.now().toString(), title: newTodoTitle.value.trim(), status: 'todo' })
  newTodoTitle.value = ''
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
const saveScratchpad = () => localStorage.setItem(SCRATCHPAD_STORAGE_KEY, scratchpad.value)

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

const setupVault = async () => {
  vaultError.value = ''
  if (!vaultSetupPassword.value || vaultSetupPassword.value.length < 6) {
    vaultError.value = 'Use at least 6 characters.'
    return
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const { key, verifier } = await deriveMaterial(vaultSetupPassword.value, salt)

  localStorage.setItem(VAULT_SALT_KEY, btoa(String.fromCharCode(...salt)))
  localStorage.setItem(VAULT_VERIFIER_KEY, verifier)

  vaultKey = key
  vaultSecrets.value = []
  vaultHasSetup.value = true
  vaultIsUnlocked.value = true
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

const addVaultSecret = () => {
  if (!vaultLabel.value.trim() || !vaultValue.value.trim()) return
  vaultSecrets.value.push({
    id: Date.now().toString(),
    label: vaultLabel.value.trim(),
    value: vaultValue.value.trim()
  })
  vaultLabel.value = ''
  vaultValue.value = ''
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
          <div class="md:col-span-1 bg-surface-container-low p-6 relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <div class="flex justify-between items-start mb-4 text-on-surface-variant">
              <span class="font-label text-xs uppercase tracking-widest">CPU_LOAD</span>
              <span class="material-symbols-outlined text-primary text-xl">speed</span>
            </div>
            <div class="flex items-baseline gap-2">
              <h2 class="font-headline text-4xl font-black text-primary tracking-tighter">{{ systemOverview?.cpuUsagePercent ?? '0.0' }}</h2>

              <span class="font-headline text-lg text-primary/60">%</span>
            </div>
            <div class="mt-4 h-1 bg-surface-container-highest w-full"><div class="h-full bg-primary" :style="{ width: `${systemOverview?.cpuUsagePercent ?? 0}%` }"></div></div>
            <div class="mt-2 font-label text-[10px] text-on-surface-variant uppercase">
              <span>CORE_STABILITY: OPTIMAL</span>
            </div>
          </div>

          <div class="md:col-span-1 bg-surface-container-low p-6 relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
            <div class="flex justify-between items-start mb-4 text-on-surface-variant">
              <span class="font-label text-xs uppercase tracking-widest">MEMORY</span>
              <span class="material-symbols-outlined text-secondary text-xl">memory</span>
            </div>
            <div class="flex items-baseline gap-2">
              <h2 class="font-headline text-4xl font-black text-secondary tracking-tighter">{{ systemOverview?.memory?.usedGb ?? '0.0' }}</h2>
              <span class="font-headline text-lg text-secondary/60">GB</span>
            </div>
            <div class="mt-4 h-1 bg-surface-container-highest w-full"><div class="h-full bg-secondary" :style="{ width: `${systemOverview?.memory?.usagePercent ?? 0}%` }"></div></div>
            <div class="mt-2 font-label text-[10px] text-on-surface-variant uppercase">
              <span>TOTAL: {{ systemOverview?.memory?.totalGb ?? '0' }} GB</span>
            </div>
          </div>

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
            <section class="space-y-4">
              <div class="flex items-center gap-3 mb-2"><span class="material-symbols-outlined text-secondary">lan</span><h3 class="font-label text-sm font-bold uppercase tracking-widest text-on-surface">NETWORK_SOCKETS</h3></div>
              <div class="bg-surface-container-low overflow-hidden border-t-2 border-secondary/30">
                <table class="w-full text-left">
                  <thead><tr class="bg-surface-container-highest text-[10px] font-label uppercase tracking-widest text-on-surface-variant"><th class="px-4 py-2">PORT</th><th class="px-4 py-2">PROCESS</th><th class="px-4 py-2 text-right">ACTION</th></tr></thead>
                  <tbody class="text-[11px] font-mono divide-y divide-outline-variant/10">
                    <tr v-for="entry in filteredPorts.slice(0, 15)" :key="`${entry.port}-${entry.pid}`" class="hover:bg-surface-container transition-colors">
                      <td class="px-4 py-3 text-primary">{{ entry.port }}</td>
                      <td class="px-4 py-3 truncate max-w-[120px]">{{ entry.processName }}</td>
                      <td class="px-4 py-3 text-right"><button @click="handleKillProcess(entry.pid, entry.port)" :disabled="isKillingPort[entry.port]" class="text-secondary hover:underline uppercase font-bold text-[9px]">{{ isKillingPort[entry.port] ? '...' : 'KILL' }}</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            
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
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <h1 class="font-headline text-2xl font-bold text-primary uppercase italic tracking-tighter">SCRATCHPAD</h1>
            <textarea v-model="scratchpad" @input="saveScratchpad" class="w-full h-[600px] bg-surface-container-low text-on-surface p-6 font-mono text-sm border-l-2 border-primary outline-none focus:bg-surface-container-high transition-colors resize-none" placeholder="READY_FOR_INPUT..."></textarea>
          </div>
          <div class="space-y-4">
            <h1 class="font-headline text-2xl font-bold text-secondary uppercase italic tracking-tighter">OPERATIONAL_TASKS</h1>
            <div class="bg-surface-container-low p-6 h-[600px] overflow-y-auto space-y-4 border-l-2 border-secondary">
               <div class="flex gap-2">
                 <input v-model="newTodoTitle" @keyup.enter="addTodo" class="flex-1 bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label uppercase text-xs" placeholder="NEW_TASK_ENTRY..." />
                 <button @click="addTodo" class="bg-secondary text-on-secondary px-6 font-bold uppercase text-[10px]">COMMIT</button>
               </div>
               <div v-for="todo in todos" :key="todo.id" class="flex items-center justify-between p-3 bg-surface-container-highest group">
                 <div class="flex items-center gap-3">
                   <button @click="moveTodo(todo, todo.status === 'done' ? 'todo' : 'done')" class="material-symbols-outlined text-sm" :class="todo.status === 'done' ? 'text-secondary' : 'text-outline-variant'">{{ todo.status === 'done' ? 'check_box' : 'check_box_outline_blank' }}</button>
                   <span :class="todo.status === 'done' ? 'line-through text-outline-variant' : ''" class="text-xs uppercase font-label">{{ todo.title }}</span>
                 </div>
                 <button @click="removeTodo(todo.id)" class="material-symbols-outlined text-xs text-outline-variant opacity-0 group-hover:opacity-100 hover:text-error">delete</button>
               </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="activePage === 'activity'">
        <div class="bg-surface-container-low p-8 border-l-4 border-primary">
          <h1 class="font-headline text-3xl font-bold text-primary uppercase italic tracking-tighter mb-8">GLOBAL_ACTIVITY_LOG</h1>
          <div class="space-y-2">
             <div v-for="entry in activityEntries" :key="entry.id" class="flex items-center gap-4 py-2 border-b border-outline-variant/10 text-xs font-mono">
                <span class="text-outline-variant w-20">[{{ formatTimeAgo(entry.timestamp) }}]</span>
                <span :class="entry.status === 'error' ? 'text-error' : 'text-primary'" class="font-bold w-32 uppercase">[{{ entry.action }}]</span>
                <span class="text-on-surface truncate flex-1">{{ entry.projectName || entry.path }}</span>
             </div>
          </div>
        </div>
      </template>

      <template v-else-if="activePage === 'vault'">
        <div class="max-w-4xl mx-auto space-y-8">
          <h1 class="font-headline text-3xl font-bold text-secondary uppercase italic tracking-tighter text-center">ENCRYPTED_VAULT</h1>
          <div v-if="!vaultIsUnlocked" class="bg-surface-container-low p-8 border-t-2 border-secondary">
             <p class="font-label text-xs uppercase text-on-surface-variant mb-4 text-center">AUTHORIZATION_REQUIRED</p>
             <input v-model="vaultUnlockPassword" @keyup.enter="unlockVault" type="password" placeholder="MASTER_KEY..." class="w-full bg-surface-container-highest p-4 outline-none mb-4 text-center" />
             <Button class="w-full h-12" @click="unlockVault">AUTHORIZE_ACCESS</Button>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div class="bg-surface-container-low p-6 space-y-4">
                <h3 class="font-label text-xs font-bold uppercase text-primary">NEW_SECRET</h3>
                <input v-model="vaultLabel" placeholder="LABEL..." class="w-full bg-surface-container-highest p-3 outline-none text-xs" />
                <input v-model="vaultValue" placeholder="VALUE..." class="w-full bg-surface-container-highest p-3 outline-none text-xs" />
                <Button class="w-full" @click="addVaultSecret">COMMIT_SECRET</Button>
             </div>
             <div class="bg-surface-container-low p-6 space-y-4">
                <h3 class="font-label text-xs font-bold uppercase text-secondary">REGISTRY</h3>
                <div v-for="s in vaultSecrets" :key="s.id" class="p-3 bg-surface-container-highest flex justify-between">
                   <div><p class="text-[10px] font-bold uppercase">{{ s.label }}</p><p class="text-[9px] font-mono text-outline-variant">{{ visibleSecretIds[s.id] ? s.value : '********' }}</p></div>
                   <div class="flex gap-2"><button @click="toggleSecretVisibility(s.id)" class="material-symbols-outlined text-xs">{{ visibleSecretIds[s.id] ? 'visibility_off' : 'visibility' }}</button><button @click="removeVaultSecret(s.id)" class="material-symbols-outlined text-xs hover:text-error">delete</button></div>
                </div>
             </div>
          </div>
          <div class="text-center"><Button variant="outline" size="sm" @click="lockVault">LOCK_VAULT</Button></div>
        </div>
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
