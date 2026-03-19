<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Project } from '../services/api'

type TicketStatus = 'backlog' | 'todo' | 'doing' | 'done'
type Ticket = {
  id: string
  title: string
  description: string
  status: TicketStatus
  projectId?: string
  createdAt: string
}

const props = defineProps<{
  projects: Project[]
}>()

const TICKETS_STORAGE_KEY = 'dev-dashboard.kanban-tickets'

const tickets = ref<Ticket[]>([])
const isAddingTicket = ref(false)
const newTicket = ref({
  title: '',
  description: '',
  status: 'backlog' as TicketStatus,
  projectId: ''
})

const columns: { id: TicketStatus; label: string }[] = [
  { id: 'backlog', label: 'BACKLOG' },
  { id: 'todo', label: 'TODO' },
  { id: 'doing', label: 'IN_PROGRESS' },
  { id: 'done', label: 'DONE' }
]

const loadTickets = () => {
  const saved = localStorage.getItem(TICKETS_STORAGE_KEY)
  if (saved) {
    try {
      tickets.value = JSON.parse(saved)
    } catch {
      tickets.value = []
    }
  }
}

const saveTickets = () => {
  localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets.value))
}

const addTicket = () => {
  if (!newTicket.value.title.trim()) return
  tickets.value.push({
    id: Date.now().toString(),
    title: newTicket.value.title.trim(),
    description: newTicket.value.description.trim(),
    status: newTicket.value.status,
    projectId: newTicket.value.projectId || undefined,
    createdAt: new Date().toISOString()
  })
  newTicket.value = { title: '', description: '', status: 'backlog', projectId: '' }
  isAddingTicket.value = false
  saveTickets()
}

const moveTicket = (id: string, status: TicketStatus) => {
  const ticket = tickets.value.find(t => t.id === id)
  if (ticket) {
    ticket.status = status
    saveTickets()
  }
}

const removeTicket = (id: string) => {
  tickets.value = tickets.value.filter(t => t.id !== id)
  saveTickets()
}

const getTicketsInColumn = (status: TicketStatus) => {
  return tickets.value.filter(t => t.status === status)
}

onMounted(loadTickets)
</script>

<template>
  <div class="space-y-6 h-full">
    <div class="flex justify-between items-center">
      <h1 class="font-headline text-3xl font-bold text-primary uppercase italic tracking-tighter">PROJECT_KANBAN</h1>
      <button
        @click="isAddingTicket = !isAddingTicket"
        class="bg-primary text-on-primary px-4 py-2 font-headline uppercase tracking-widest text-xs font-bold active:scale-95 transition-all"
      >
        {{ isAddingTicket ? 'CANCEL_ENTRY' : 'NEW_TICKET' }}
      </button>
    </div>

    <!-- Ticket Entry Form -->
    <div v-if="isAddingTicket" class="bg-surface-container-low p-6 border-l-2 border-primary space-y-4 animate-in fade-in slide-in-from-top-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <label class="text-[10px] font-label font-bold text-outline-variant uppercase">TICKET_TITLE</label>
          <input
            v-model="newTicket.title"
            class="w-full bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label uppercase text-xs"
            placeholder="DEFINE_TASK..."
          />
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-label font-bold text-outline-variant uppercase">ASSIGN_PROJECT</label>
          <select
            v-model="newTicket.projectId"
            class="w-full bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label uppercase text-xs appearance-none"
          >
            <option value="">NONE</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-label font-bold text-outline-variant uppercase">INITIAL_STATUS</label>
          <select
            v-model="newTicket.status"
            class="w-full bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label uppercase text-xs appearance-none"
          >
            <option v-for="col in columns" :key="col.id" :value="col.id">{{ col.label }}</option>
          </select>
        </div>
      </div>
      <div class="space-y-2">
        <label class="text-[10px] font-label font-bold text-outline-variant uppercase">DESCRIPTION</label>
        <textarea
          v-model="newTicket.description"
          class="w-full h-24 bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label text-xs resize-none"
          placeholder="MISSION_DETAILS..."
        ></textarea>
      </div>
      <button
        @click="addTicket"
        class="w-full bg-primary text-on-primary py-3 font-bold uppercase text-[10px] active:scale-95 transition-transform"
      >
        COMMIT_TO_BOARD
      </button>
    </div>

    <!-- Kanban Board -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
      <div v-for="col in columns" :key="col.id" class="flex flex-col bg-surface-container-low border-t-2 border-outline-variant/30 h-full">
        <div class="p-3 bg-surface-container-highest flex justify-between items-center">
          <span class="text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest">{{ col.label }}</span>
          <span class="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[9px] font-bold">{{ getTicketsInColumn(col.id).length }}</span>
        </div>

        <div class="flex-1 p-3 space-y-3 overflow-y-auto min-h-[500px]">
          <div
            v-for="ticket in getTicketsInColumn(col.id)"
            :key="ticket.id"
            class="bg-surface-container-highest p-4 border-l-2 border-primary/40 group hover:border-primary transition-colors"
          >
            <div class="flex justify-between items-start mb-1">
              <h3 class="text-xs font-bold uppercase text-on-surface">{{ ticket.title }}</h3>
              <button @click="removeTicket(ticket.id)" class="material-symbols-outlined text-xs text-outline-variant opacity-0 group-hover:opacity-100 hover:text-error transition-opacity">delete</button>
            </div>
            <div v-if="ticket.projectId" class="mb-2">
              <span class="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 font-bold uppercase tracking-tighter">
                {{ projects.find(p => p.id === ticket.projectId)?.name || 'UNKNOWN' }}
              </span>
            </div>
            <p v-if="ticket.description" class="text-[10px] text-on-surface-variant leading-relaxed mb-4">{{ ticket.description }}</p>

            <div class="flex gap-1 justify-end">
              <button
                v-for="nextCol in columns.filter(c => c.id !== col.id)"
                :key="nextCol.id"
                @click="moveTicket(ticket.id, nextCol.id)"
                class="text-[8px] font-label font-bold uppercase text-primary hover:underline"
                :title="'MOVE_TO_' + nextCol.label"
              >
                {{ nextCol.label.split('_')[0] }}
              </button>
            </div>
          </div>

          <div v-if="getTicketsInColumn(col.id).length === 0" class="h-20 border border-dashed border-outline-variant/20 flex items-center justify-center">
            <span class="text-[9px] font-label uppercase text-outline-variant/50 tracking-tighter">VACANT</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.overflow-y-auto::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.overflow-y-auto {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
