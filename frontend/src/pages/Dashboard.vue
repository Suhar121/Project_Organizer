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
  X
} from 'lucide-vue-next'
import ProjectCard from '../components/ProjectCard.vue'
import AddProjectDialog from '../components/AddProjectDialog.vue'
import EditProjectDialog from '../components/EditProjectDialog.vue'
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
  fetchActivity
} from '../services/api'
import type {
  Project,
  SystemOverview,
  PortEntry,
  ActivityEntry
} from '../services/api'

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

const accentPresets = ['#3b82f6', '#14b8a6', '#f97316', '#ef4444', '#22c55e', '#eab308']

const activePage = ref<AppPage>('dashboard')
const isPortsMinimized = ref(false)
const draggingTodoId = ref<string | null>(null)

const projects = ref<Project[]>([])
const search = ref('')
const tagFilter = ref('')
const isAddDialogOpen = ref(false)
const isEditDialogOpen = ref(false)
const projectToEdit = ref<Project | null>(null)

const isDark = ref(true)
const accentColor = ref('#3b82f6')

const systemOverview = ref<SystemOverview | null>(null)
const ports = ref<PortEntry[]>([])
const activityEntries = ref<ActivityEntry[]>([])
const isSystemLoading = ref(false)
const isPortsLoading = ref(false)
const isActivityLoading = ref(false)
const portSearch = ref('')

const bookmarks = ref<Bookmark[]>([])
const bookmarkName = ref('')
const bookmarkUrl = ref('')
const bookmarkCategory = ref('custom')
const editingBookmarkIndex = ref<number | null>(null)

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
const vaultNote = ref('')
const visibleSecretIds = ref<Record<string, boolean>>({})
let vaultKey: CryptoKey | null = null

let refreshHandle: number | null = null
const hasLoadedDashboardData = ref(false)
const hasLoadedActivityData = ref(false)

const currentPageTitle = computed(() => {
  if (activePage.value === 'notes') return 'Global Notes'
  if (activePage.value === 'activity') return 'Activity Log'
  if (activePage.value === 'vault') return 'Secret Vault'
  return 'Dashboard'
})

const applyTheme = () => {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem(THEME_STORAGE_KEY, isDark.value ? 'dark' : 'light')
}

const applyAccent = () => {
  document.documentElement.style.setProperty('--accent-color', accentColor.value)
  localStorage.setItem(ACCENT_STORAGE_KEY, accentColor.value)
}

const toggleDark = () => {
  isDark.value = !isDark.value
  applyTheme()
}

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
    await Promise.all([loadSystemOverview(), loadPorts()])
    return
  }
  if (activePage.value === 'activity') {
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
    result = result.filter(project =>
      project.name.toLowerCase().includes(q) ||
      (project.description && project.description.toLowerCase().includes(q))
    )
  }

  if (tagFilter.value) {
    const targetTag = tagFilter.value.toLowerCase()
    result = result.filter(project => project.tags?.some(tag => tag.toLowerCase() === targetTag))
  }

  return result.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return 0
  })
})

const groupedProjects = computed(() => {
  const groups = new Map<string, { key: string; label: string; projects: Project[] }>()

  for (const project of filteredProjects.value) {
    const root = project.rootFolder || ''
    const key = root || '__ungrouped__'
    if (!groups.has(key)) {
      const label = root
        ? root.split(/[/\\]/).filter(Boolean).pop() || root
        : 'Ungrouped'
      groups.set(key, { key, label, projects: [] })
    }
    groups.get(key)?.projects.push(project)
  }

  const items = Array.from(groups.values())
  items.sort((a, b) => {
    if (a.key === '__ungrouped__') return 1
    if (b.key === '__ungrouped__') return -1
    return a.label.localeCompare(b.label)
  })

  return items
})

const collapsedProjectGroups = ref<Record<string, boolean>>({})

const saveCollapsedGroups = () => {
  localStorage.setItem(PROJECT_GROUPS_COLLAPSE_KEY, JSON.stringify(collapsedProjectGroups.value))
}

const isGroupCollapsed = (groupKey: string) => {
  return !!collapsedProjectGroups.value[groupKey]
}

const toggleGroupCollapsed = (groupKey: string) => {
  collapsedProjectGroups.value[groupKey] = !collapsedProjectGroups.value[groupKey]
  saveCollapsedGroups()
}

const filteredPorts = computed(() => {
  if (!portSearch.value.trim()) return ports.value
  const q = portSearch.value.toLowerCase()
  return ports.value.filter(entry =>
    String(entry.port).includes(q) ||
    entry.host.toLowerCase().includes(q) ||
    entry.processName.toLowerCase().includes(q) ||
    (entry.projectName && entry.projectName.toLowerCase().includes(q))
  )
})

const saveBookmarks = () => {
  localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks.value))
}

const resetBookmarkForm = () => {
  bookmarkName.value = ''
  bookmarkUrl.value = ''
  bookmarkCategory.value = 'custom'
  editingBookmarkIndex.value = null
}

const submitBookmark = () => {
  if (!bookmarkName.value.trim() || !bookmarkUrl.value.trim()) return
  const safeUrl = bookmarkUrl.value.startsWith('http://') || bookmarkUrl.value.startsWith('https://')
    ? bookmarkUrl.value.trim()
    : `http://${bookmarkUrl.value.trim()}`

  const item: Bookmark = {
    name: bookmarkName.value.trim(),
    url: safeUrl,
    category: bookmarkCategory.value.trim() || 'custom'
  }

  if (editingBookmarkIndex.value !== null) {
    bookmarks.value[editingBookmarkIndex.value] = item
  } else {
    bookmarks.value.push(item)
  }

  saveBookmarks()
  resetBookmarkForm()
}

const editBookmark = (index: number) => {
  const item = bookmarks.value[index]
  if (!item) return
  bookmarkName.value = item.name
  bookmarkUrl.value = item.url
  bookmarkCategory.value = item.category
  editingBookmarkIndex.value = index
}

const deleteBookmark = (index: number) => {
  bookmarks.value.splice(index, 1)
  saveBookmarks()
  if (editingBookmarkIndex.value === index) {
    resetBookmarkForm()
  }
}

const saveScratchpad = () => {
  localStorage.setItem(SCRATCHPAD_STORAGE_KEY, scratchpad.value)
}

const saveTodos = () => {
  localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos.value))
}

const addTodo = () => {
  if (!newTodoTitle.value.trim()) return
  todos.value.unshift({
    id: Date.now().toString(),
    title: newTodoTitle.value.trim(),
    status: 'todo'
  })
  newTodoTitle.value = ''
  saveTodos()
}

const moveTodo = (todo: TodoItem, status: TodoStatus) => {
  todo.status = status
  saveTodos()
}

const onTodoDragStart = (todoId: string) => {
  draggingTodoId.value = todoId
}

const onTodoDragEnd = () => {
  draggingTodoId.value = null
}

const onTodoDrop = (status: TodoStatus) => {
  if (!draggingTodoId.value) return
  const todo = todos.value.find(item => item.id === draggingTodoId.value)
  if (!todo) return
  todo.status = status
  draggingTodoId.value = null
  saveTodos()
}

const removeTodo = (todoId: string) => {
  todos.value = todos.value.filter(todo => todo.id !== todoId)
  saveTodos()
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

const fromBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

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
      salt: toArrayBuffer(salt),
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
      salt: toArrayBuffer(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )

  return { key, verifier: toBase64(new Uint8Array(bits)) }
}

const persistVaultSecrets = async () => {
  if (!vaultKey) return
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(vaultSecrets.value))
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, vaultKey, plaintext)
  localStorage.setItem(VAULT_DATA_KEY, JSON.stringify({ iv: toBase64(iv), data: toBase64(new Uint8Array(cipherBuffer)) }))
}

const lockVault = () => {
  vaultKey = null
  vaultIsUnlocked.value = false
  vaultUnlockPassword.value = ''
  vaultError.value = ''
  visibleSecretIds.value = {}
}

const initializeVault = () => {
  const hasSalt = !!localStorage.getItem(VAULT_SALT_KEY)
  const hasVerifier = !!localStorage.getItem(VAULT_VERIFIER_KEY)
  vaultHasSetup.value = hasSalt && hasVerifier
}

const setupVault = async () => {
  vaultError.value = ''
  if (!vaultSetupPassword.value || vaultSetupPassword.value.length < 6) {
    vaultError.value = 'Use at least 6 characters for vault password.'
    return
  }
  if (vaultSetupPassword.value !== vaultSetupConfirm.value) {
    vaultError.value = 'Passwords do not match.'
    return
  }

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const { key, verifier } = await deriveMaterial(vaultSetupPassword.value, salt)

  localStorage.setItem(VAULT_SALT_KEY, toBase64(salt))
  localStorage.setItem(VAULT_VERIFIER_KEY, verifier)

  vaultKey = key
  vaultSecrets.value = []
  await persistVaultSecrets()

  vaultSetupPassword.value = ''
  vaultSetupConfirm.value = ''
  vaultHasSetup.value = true
  vaultIsUnlocked.value = true
}

const unlockVault = async () => {
  vaultError.value = ''
  const saltRaw = localStorage.getItem(VAULT_SALT_KEY)
  const verifier = localStorage.getItem(VAULT_VERIFIER_KEY)
  if (!saltRaw || !verifier) {
    vaultError.value = 'Vault is not initialized.'
    initializeVault()
    return
  }

  const salt = fromBase64(saltRaw)
  const derived = await deriveMaterial(vaultUnlockPassword.value, salt)
  if (derived.verifier !== verifier) {
    vaultError.value = 'Incorrect vault password.'
    return
  }

  vaultKey = derived.key
  vaultIsUnlocked.value = true
  vaultUnlockPassword.value = ''

  const encrypted = localStorage.getItem(VAULT_DATA_KEY)
  if (!encrypted) {
    vaultSecrets.value = []
    return
  }

  try {
    const payload = JSON.parse(encrypted) as { iv: string; data: string }
    const iv = fromBase64(payload.iv)
    const data = fromBase64(payload.data)
    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, vaultKey, toArrayBuffer(data))
    const parsed = JSON.parse(new TextDecoder().decode(new Uint8Array(plainBuffer)))
    vaultSecrets.value = Array.isArray(parsed) ? parsed : []
  } catch (error) {
    vaultError.value = 'Unable to decrypt vault data.'
    lockVault()
  }
}

const addVaultSecret = async () => {
  if (!vaultIsUnlocked.value || !vaultKey) return
  if (!vaultLabel.value.trim() || !vaultValue.value.trim()) return

  vaultSecrets.value.unshift({
    id: Date.now().toString(),
    label: vaultLabel.value.trim(),
    value: vaultValue.value.trim(),
    note: vaultNote.value.trim()
  })

  vaultLabel.value = ''
  vaultValue.value = ''
  vaultNote.value = ''

  await persistVaultSecrets()
}

const removeVaultSecret = async (id: string) => {
  vaultSecrets.value = vaultSecrets.value.filter(item => item.id !== id)
  await persistVaultSecrets()
}

const toggleSecretVisibility = (id: string) => {
  visibleSecretIds.value[id] = !visibleSecretIds.value[id]
}

const todosByStatus = (status: TodoStatus) => todos.value.filter(todo => todo.status === status)

const statusTitle: Record<TodoStatus, string> = {
  todo: 'Todo',
  doing: 'Doing',
  done: 'Done'
}

const statusVariant: Record<TodoStatus, 'secondary' | 'default'> = {
  todo: 'secondary',
  doing: 'default',
  done: 'secondary'
}

const activityActionLabel = (action: string) => {
  if (action === 'run') return 'Run Project'
  if (action === 'open-vscode') return 'Open in VS Code'
  if (action === 'open-folder') return 'Open Folder'
  return action
}

const formatTimeAgo = (iso: string) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

onMounted(() => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (savedTheme === 'light') isDark.value = false

  const savedAccent = localStorage.getItem(ACCENT_STORAGE_KEY)
  if (savedAccent) accentColor.value = savedAccent

  const rawBookmarks = localStorage.getItem(BOOKMARKS_STORAGE_KEY)
  if (rawBookmarks) {
    try {
      const parsed = JSON.parse(rawBookmarks)
      bookmarks.value = Array.isArray(parsed) ? parsed : defaultBookmarks
    } catch {
      bookmarks.value = defaultBookmarks
    }
  } else {
    bookmarks.value = [...defaultBookmarks]
  }

  scratchpad.value = localStorage.getItem(SCRATCHPAD_STORAGE_KEY) || ''

  const rawTodos = localStorage.getItem(TODOS_STORAGE_KEY)
  if (rawTodos) {
    try {
      const parsed = JSON.parse(rawTodos)
      if (Array.isArray(parsed)) todos.value = parsed
    } catch {
      todos.value = []
    }
  }

  const rawCollapsedGroups = localStorage.getItem(PROJECT_GROUPS_COLLAPSE_KEY)
  if (rawCollapsedGroups) {
    try {
      const parsed = JSON.parse(rawCollapsedGroups)
      collapsedProjectGroups.value = parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      collapsedProjectGroups.value = {}
    }
  }

  initializeVault()

  applyTheme()
  applyAccent()

  loadProjects()

  if (activePage.value === 'dashboard') {
    refreshOpsData()
    hasLoadedDashboardData.value = true
  }

  refreshHandle = window.setInterval(() => {
    refreshOpsData()
  }, 60000)
})

watch(activePage, async (page) => {
  if (page === 'dashboard' && !hasLoadedDashboardData.value) {
    await Promise.all([loadSystemOverview(), loadPorts()])
    hasLoadedDashboardData.value = true
    return
  }

  if (page === 'activity' && !hasLoadedActivityData.value) {
    await loadActivity()
    hasLoadedActivityData.value = true
  }
})

onBeforeUnmount(() => {
  if (refreshHandle !== null) clearInterval(refreshHandle)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 dark:bg-gray-950 flex font-sans text-gray-900 dark:text-gray-100 transition-colors">
    <aside class="w-64 border-r bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-col h-screen sticky top-0">
      <div class="h-14 flex items-center px-6 font-bold text-lg border-b dark:border-gray-800 tracking-tight gap-2">
        <Layers class="h-5 w-5 accent-text" />
        Local Dash
      </div>

      <div class="p-4 flex-1 overflow-auto">
        <nav class="space-y-1">
          <Button
            :variant="activePage === 'dashboard' ? 'secondary' : 'ghost'"
            class="w-full justify-start text-left font-medium"
            @click="activePage = 'dashboard'"
          >
            <LayoutDashboard class="mr-2 h-4 w-4" />
            Dashboard
          </Button>

          <Button
            :variant="activePage === 'notes' ? 'secondary' : 'ghost'"
            class="w-full justify-start text-left font-medium"
            @click="activePage = 'notes'"
          >
            <NotebookPen class="mr-2 h-4 w-4" />
            Notes
          </Button>

          <Button
            :variant="activePage === 'activity' ? 'secondary' : 'ghost'"
            class="w-full justify-start text-left font-medium"
            @click="activePage = 'activity'"
          >
            <Activity class="mr-2 h-4 w-4" />
            Activity
          </Button>

          <Button
            :variant="activePage === 'vault' ? 'secondary' : 'ghost'"
            class="w-full justify-start text-left font-medium"
            @click="activePage = 'vault'"
          >
            <LockKeyhole class="mr-2 h-4 w-4" />
            Vault
          </Button>

          <Button variant="ghost" class="w-full justify-start text-left font-medium" @click="isAddDialogOpen = true">
            <Plus class="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </nav>

        <div class="mt-8 space-y-4">
          <h4 class="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Settings</h4>

          <Button variant="ghost" class="w-full justify-start text-left font-medium" @click="toggleDark">
            <component :is="isDark ? Sun : Moon" class="mr-2 h-4 w-4" />
            {{ isDark ? 'Light' : 'Dark' }} Mode
          </Button>

          <div class="px-2 space-y-2">
            <div class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Palette class="h-3.5 w-3.5" /> Accent Color
            </div>
            <Input type="color" v-model="accentColor" @input="applyAccent" class="h-10 p-1" />
            <div class="flex flex-wrap gap-2 pt-1">
              <button
                v-for="preset in accentPresets"
                :key="preset"
                class="h-5 w-5 rounded-full border border-gray-300 dark:border-gray-700"
                :style="{ backgroundColor: preset }"
                @click="accentColor = preset; applyAccent()"
                :title="`Use ${preset}`"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-h-screen">
      <header class="h-14 border-b bg-white dark:bg-gray-900 dark:border-gray-800 flex items-center px-6 justify-between sticky top-0 z-10 shadow-sm">
        <div class="flex items-center flex-1 max-w-md relative" v-if="activePage === 'dashboard'">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            v-model="search"
            placeholder="Search projects..."
            class="pl-9 bg-gray-50 dark:bg-gray-800 border-none h-9 focus-visible:ring-1"
          />
        </div>
        <div v-else class="text-lg font-semibold">{{ currentPageTitle }}</div>

        <div class="flex items-center gap-4">
          <Button @click="refreshOpsData" size="sm" variant="outline" class="h-9">
            <RefreshCw class="mr-2 h-4 w-4" /> Refresh Data
          </Button>
          <Button @click="isAddDialogOpen = true" size="sm" class="h-9">
            <Plus class="mr-2 h-4 w-4" /> Add Project
          </Button>
        </div>
      </header>

      <div class="p-8 flex-1 overflow-auto">
        <template v-if="activePage === 'dashboard'">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle class="text-sm font-medium flex items-center gap-2"><Cpu class="h-4 w-4" /> CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="text-2xl font-semibold">
                  <span v-if="systemOverview">{{ systemOverview.cpuUsagePercent ?? '--' }}%</span>
                  <span v-else>--</span>
                </div>
                <div class="mt-2 h-2 w-full rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div class="h-2 accent-bg" :style="{ width: `${systemOverview?.cpuUsagePercent ?? 0}%` }"></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle class="text-sm font-medium flex items-center gap-2"><MemoryStick class="h-4 w-4" /> RAM Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="text-2xl font-semibold">
                  <span v-if="systemOverview">{{ systemOverview.memory.usedGb }} / {{ systemOverview.memory.totalGb }} GB</span>
                  <span v-else>--</span>
                </div>
                <div class="mt-2 h-2 w-full rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div class="h-2 accent-bg" :style="{ width: `${systemOverview?.memory.usagePercent ?? 0}%` }"></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle class="text-sm font-medium flex items-center gap-2"><Network class="h-4 w-4" /> Open Ports</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="text-2xl font-semibold">{{ ports.length }}</div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Listening TCP ports detected on this machine.</p>
              </CardContent>
            </Card>
          </div>

          <Card class="mb-6">
            <CardHeader>
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle class="text-sm font-medium">Port Manager</CardTitle>
                <div class="flex gap-2 items-center w-full sm:w-auto">
                  <Input v-model="portSearch" placeholder="Filter by port, process, project..." class="w-full sm:w-72" />
                  <Button variant="outline" size="sm" @click="loadPorts" :disabled="isPortsLoading">
                    <RefreshCw class="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" @click="isPortsMinimized = !isPortsMinimized">
                    <ChevronRight v-if="isPortsMinimized" class="h-4 w-4 mr-1" />
                    <ChevronDown v-else class="h-4 w-4 mr-1" />
                    {{ isPortsMinimized ? 'Restore' : 'Minimize' }}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent v-if="!isPortsMinimized">
              <div class="overflow-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left border-b border-gray-200 dark:border-gray-800">
                      <th class="py-2 pr-3">Port</th>
                      <th class="py-2 pr-3">Host</th>
                      <th class="py-2 pr-3">PID</th>
                      <th class="py-2 pr-3">Process</th>
                      <th class="py-2 pr-3">Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="entry in filteredPorts.slice(0, 100)" :key="`${entry.port}-${entry.pid}`" class="border-b border-gray-100 dark:border-gray-900">
                      <td class="py-2 pr-3 font-mono">{{ entry.port }}</td>
                      <td class="py-2 pr-3 font-mono text-xs">{{ entry.host }}</td>
                      <td class="py-2 pr-3 font-mono">{{ entry.pid }}</td>
                      <td class="py-2 pr-3">{{ entry.processName }}</td>
                      <td class="py-2 pr-3">
                        <Badge v-if="entry.projectName" variant="secondary">{{ entry.projectName }}</Badge>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p v-if="filteredPorts.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4">No listening ports found for this filter.</p>
              </div>
            </CardContent>
            <CardContent v-else>
              <p class="text-sm text-gray-500 dark:text-gray-400">Port Manager minimized. Click restore to show the table.</p>
            </CardContent>
          </Card>

          <Card class="mb-6">
            <CardHeader>
              <CardTitle class="text-sm font-medium">Global Links / Bookmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                <Input v-model="bookmarkName" placeholder="Bookmark name" />
                <Input v-model="bookmarkUrl" placeholder="http://localhost:3000" />
                <Input v-model="bookmarkCategory" placeholder="Category" />
                <div class="flex gap-2">
                  <Button class="flex-1" @click="submitBookmark">{{ editingBookmarkIndex !== null ? 'Update' : 'Add' }}</Button>
                  <Button v-if="editingBookmarkIndex !== null" variant="outline" @click="resetBookmarkForm">
                    <X class="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div class="space-y-2">
                <div
                  v-for="(link, idx) in bookmarks"
                  :key="`${link.name}-${link.url}-${idx}`"
                  class="rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 flex items-center justify-between gap-3"
                >
                  <a
                    :href="link.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-sm hover:underline"
                  >
                    <span>{{ link.name }}</span>
                    <Badge variant="outline">{{ link.category }}</Badge>
                    <ExternalLink class="h-3.5 w-3.5" />
                  </a>
                  <div class="flex items-center gap-1">
                    <Button size="sm" variant="outline" @click="editBookmark(idx)">
                      <Pencil class="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" @click="deleteBookmark(idx)">
                      <Trash2 class="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
            <div>
              <h1 class="text-3xl font-bold tracking-tight">Projects</h1>
              <p class="text-gray-500 mt-1 dark:text-gray-400">Manage and launch your local development environments.</p>
            </div>

            <div v-if="availableTags.length > 0" class="flex flex-wrap gap-2 items-center">
              <Tag class="w-4 h-4 text-gray-500" />
              <Badge
                v-for="tag in availableTags"
                :key="tag"
                @click="toggleTagFilter(tag)"
                class="cursor-pointer transition-colors"
                :variant="tagFilter === tag ? 'default' : 'secondary'"
              >
                {{ tag }}
              </Badge>
            </div>
          </div>

          <div v-if="filteredProjects.length === 0" class="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed dark:border-gray-800 bg-white dark:bg-gray-900 border-gray-200">
            <Layers class="h-10 w-10 text-gray-400 mb-4" />
            <h2 class="text-lg font-semibold mb-2">No projects found</h2>
            <p class="text-gray-500 max-w-sm mb-4">You haven't added any projects yet, or none match your search criteria.</p>
            <Button @click="isAddDialogOpen = true">Add your first project</Button>
          </div>

          <div v-else class="space-y-8">
            <div v-for="group in groupedProjects" :key="group.key" class="space-y-3">
              <div class="flex items-center justify-between">
                <button
                  class="inline-flex items-center gap-2 text-left"
                  @click="toggleGroupCollapsed(group.key)"
                  :title="isGroupCollapsed(group.key) ? 'Expand group' : 'Collapse group'"
                >
                  <ChevronRight v-if="isGroupCollapsed(group.key)" class="h-4 w-4 text-gray-500" />
                  <ChevronDown v-else class="h-4 w-4 text-gray-500" />
                  <h3 class="text-lg font-semibold tracking-tight">{{ group.label }}</h3>
                </button>
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ group.projects.length }} project(s)</span>
              </div>

              <div v-if="!isGroupCollapsed(group.key)" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ProjectCard
                  v-for="project in group.projects"
                  :key="project.id"
                  :project="project"
                  @deleted="loadProjects"
                  @updated="loadProjects"
                  @edit="openEditDialog"
                />
              </div>

              <p v-else class="text-sm text-gray-500 dark:text-gray-400">Group collapsed.</p>
            </div>
          </div>
        </template>

        <template v-else-if="activePage === 'notes'">
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle class="text-sm font-medium flex items-center gap-2"><ClipboardList class="h-4 w-4" /> Global Todo Board</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex gap-2 mb-4">
                  <Input v-model="newTodoTitle" placeholder="Add a task across projects..." @keyup.enter="addTodo" />
                  <Button @click="addTodo">Add</Button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    v-for="status in ['todo', 'doing', 'done']"
                    :key="status"
                    class="rounded-lg border border-gray-200 dark:border-gray-800 p-3"
                    @dragover.prevent
                    @drop="onTodoDrop(status as TodoStatus)"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="text-sm font-semibold">{{ statusTitle[status as TodoStatus] }}</h4>
                      <Badge :variant="statusVariant[status as TodoStatus]">{{ todosByStatus(status as TodoStatus).length }}</Badge>
                    </div>
                    <div class="space-y-2">
                      <div
                        v-for="todo in todosByStatus(status as TodoStatus)"
                        :key="todo.id"
                        class="rounded-md border border-gray-200 dark:border-gray-800 p-2 text-sm cursor-move"
                        draggable="true"
                        @dragstart="onTodoDragStart(todo.id)"
                        @dragend="onTodoDragEnd"
                      >
                        <p class="mb-2">{{ todo.title }}</p>
                        <div class="flex items-center gap-1">
                          <Button
                            v-if="status !== 'todo'"
                            size="sm"
                            variant="outline"
                            @click="moveTodo(todo, status === 'done' ? 'doing' : 'todo')"
                          >
                            Back
                          </Button>
                          <Button
                            v-if="status !== 'done'"
                            size="sm"
                            variant="outline"
                            @click="moveTodo(todo, status === 'todo' ? 'doing' : 'done')"
                          >
                            <ArrowRight class="h-3 w-3 mr-1" />
                            Move
                          </Button>
                          <Button size="sm" variant="outline" @click="removeTodo(todo.id)">Remove</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle class="text-sm font-medium flex items-center gap-2"><NotebookPen class="h-4 w-4" /> Scratchpad</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  v-model="scratchpad"
                  @input="saveScratchpad"
                  placeholder="Jot quick ideas, commands, bug notes, or meeting points here..."
                  class="w-full h-72 rounded-md border border-gray-200 dark:border-gray-800 bg-transparent p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
                ></textarea>
              </CardContent>
            </Card>
          </div>
        </template>

        <template v-else-if="activePage === 'activity'">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle class="text-sm font-medium flex items-center gap-2"><Activity class="h-4 w-4" /> Activity Log</CardTitle>
                <Button variant="outline" size="sm" @click="loadActivity" :disabled="isActivityLoading">
                  <RefreshCw class="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div class="space-y-2">
                <div
                  v-for="entry in activityEntries"
                  :key="entry.id"
                  class="rounded-md border border-gray-200 dark:border-gray-800 p-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <div class="font-medium text-sm">{{ activityActionLabel(entry.action) }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{{ entry.projectName || entry.path }}</span>
                      <span class="mx-1">-</span>
                      <span>{{ entry.details }}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <Badge :variant="entry.status === 'success' ? 'secondary' : 'destructive'">{{ entry.status }}</Badge>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ formatTimeAgo(entry.timestamp) }}</p>
                  </div>
                </div>
                <p v-if="activityEntries.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No activity yet. Launch or open a project to populate this log.</p>
              </div>
            </CardContent>
          </Card>
        </template>

        <template v-else>
          <Card v-if="!vaultHasSetup" class="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle class="text-sm font-medium flex items-center gap-2"><ShieldCheck class="h-4 w-4" /> Setup Secret Vault</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Create a vault password once. Secrets stay encrypted in your local browser storage for lightweight offline use.
              </p>
              <div class="space-y-3">
                <Input v-model="vaultSetupPassword" type="password" placeholder="Set vault password" />
                <Input v-model="vaultSetupConfirm" type="password" placeholder="Confirm vault password" />
                <p v-if="vaultError" class="text-sm text-red-500">{{ vaultError }}</p>
                <Button class="w-full" @click="setupVault">Create Vault</Button>
              </div>
            </CardContent>
          </Card>

          <Card v-else-if="!vaultIsUnlocked" class="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle class="text-sm font-medium flex items-center gap-2"><LockKeyhole class="h-4 w-4" /> Unlock Vault</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-3">
                <Input v-model="vaultUnlockPassword" type="password" placeholder="Vault password" @keyup.enter="unlockVault" />
                <p v-if="vaultError" class="text-sm text-red-500">{{ vaultError }}</p>
                <Button class="w-full" @click="unlockVault">Unlock</Button>
              </div>
            </CardContent>
          </Card>

          <div v-else class="space-y-6">
            <Card>
              <CardHeader>
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle class="text-sm font-medium flex items-center gap-2"><LockKeyhole class="h-4 w-4" /> Vault Secrets</CardTitle>
                  <Button variant="outline" size="sm" @click="lockVault">Lock Vault</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                  <Input v-model="vaultLabel" placeholder="Label (e.g. OpenAI API Key)" />
                  <Input v-model="vaultValue" placeholder="Secret value" />
                  <Input v-model="vaultNote" placeholder="Note (optional)" />
                </div>
                <Button @click="addVaultSecret">Add Secret</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle class="text-sm font-medium">Stored Secrets</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-2">
                  <div
                    v-for="secret in vaultSecrets"
                    :key="secret.id"
                    class="rounded-md border border-gray-200 dark:border-gray-800 p-3 flex items-start justify-between gap-3"
                  >
                    <div class="min-w-0">
                      <p class="font-medium text-sm">{{ secret.label }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">
                        {{ visibleSecretIds[secret.id] ? secret.value : '••••••••••••••••' }}
                      </p>
                      <p v-if="secret.note" class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ secret.note }}</p>
                    </div>
                    <div class="flex items-center gap-1">
                      <Button size="sm" variant="outline" @click="toggleSecretVisibility(secret.id)">
                        <Eye v-if="!visibleSecretIds[secret.id]" class="h-3.5 w-3.5 mr-1" />
                        <EyeOff v-else class="h-3.5 w-3.5 mr-1" />
                        {{ visibleSecretIds[secret.id] ? 'Hide' : 'Show' }}
                      </Button>
                      <Button size="sm" variant="outline" @click="removeVaultSecret(secret.id)">
                        <Trash2 class="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                  <p v-if="vaultSecrets.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No secrets saved yet.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </template>
      </div>
    </main>

    <AddProjectDialog v-model:open="isAddDialogOpen" @added="loadProjects" />
    <EditProjectDialog v-model:open="isEditDialogOpen" :project="projectToEdit" @updated="loadProjects" />
  </div>
</template>
