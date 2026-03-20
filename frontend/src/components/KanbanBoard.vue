<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Project, KanbanTicket } from '../services/api'
import {
  fetchKanbanTickets,
  createKanbanTicket,
  updateKanbanTicket,
  deleteKanbanTicket
} from '../services/api'

type TicketStatus = 'backlog' | 'todo' | 'doing' | 'done'

const props = defineProps<{
  projects: Project[]
}>()

const tickets = ref<KanbanTicket[]>([])
const isAddingTicket = ref(false)
const newTicket = ref({
  title: '',
  description: '',
  status: 'backlog' as TicketStatus,
  projectId: ''
})

const columns: { id: TicketStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'doing', label: 'In Progress' },
  { id: 'done', label: 'Done' }
]

const loadTickets = async () => {
  try {
    tickets.value = await fetchKanbanTickets()
  } catch (err) {
    console.error('Failed to load tickets:', err)
  }
}

const addTicket = async () => {
  if (!newTicket.value.title.trim()) return
  try {
    const created = await createKanbanTicket({
      title: newTicket.value.title.trim(),
      description: newTicket.value.description.trim(),
      status: newTicket.value.status,
      projectId: newTicket.value.projectId || undefined,
      createdAt: new Date().toISOString()
    })
    tickets.value.push(created)
    newTicket.value = { title: '', description: '', status: 'backlog', projectId: '' }
    isAddingTicket.value = false
  } catch (err) {
    console.error('Failed to add ticket:', err)
  }
}

const moveTicket = async (id: string, status: TicketStatus) => {
  try {
    await updateKanbanTicket(id, { status })
    const ticket = tickets.value.find(t => t.id === id)
    if (ticket) ticket.status = status
  } catch (err) {
    console.error('Failed to move ticket:', err)
  }
}

const removeTicket = async (id: string) => {
  try {
    await deleteKanbanTicket(id)
    tickets.value = tickets.value.filter(t => t.id !== id)
  } catch (err) {
    console.error('Failed to delete ticket:', err)
  }
}

const getTicketsInColumn = (status: TicketStatus) => {
  return tickets.value.filter(t => t.status === status)
}

onMounted(loadTickets)
</script>

<template>
  <div class="space-y-6 h-full">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold text-on-surface tracking-tight">Kanban Board</h1>
      <button
        @click="isAddingTicket = !isAddingTicket"
        class="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-medium active:scale-95 transition-all shadow-sm hover:bg-primary/90"
      >
        {{ isAddingTicket ? 'Cancel' : 'New Ticket' }}
      </button>
    </div>

    <!-- Ticket Entry Form -->
    <div v-if="isAddingTicket" class="bg-surface-container-low p-6 rounded-xl border border-outline-variant/30 space-y-4 animate-in fade-in slide-in-from-top-4 shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <label class="text-xs font-medium text-on-surface-variant">Ticket Title</label>
          <input
            v-model="newTicket.title"
            class="w-full bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg outline-none text-sm border border-outline-variant/20 focus:border-primary/50 transition-colors"
            placeholder="What needs to be done?"
          />
        </div>
        <div class="space-y-2">
          <label class="text-xs font-medium text-on-surface-variant">Project</label>
          <div class="relative">
            <select
              v-model="newTicket.projectId"
              class="w-full bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg outline-none text-sm appearance-none border border-outline-variant/20 focus:border-primary/50 transition-colors"
            >
              <option value="">None</option>
              <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-xs font-medium text-on-surface-variant">Initial Status</label>
          <select
            v-model="newTicket.status"
            class="w-full bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg outline-none text-sm appearance-none border border-outline-variant/20 focus:border-primary/50 transition-colors"
          >
            <option v-for="col in columns" :key="col.id" :value="col.id">{{ col.label }}</option>
          </select>
        </div>
      </div>
      <div class="space-y-2">
        <label class="text-xs font-medium text-on-surface-variant">Description</label>
        <textarea
          v-model="newTicket.description"
          class="w-full h-24 bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg outline-none text-sm resize-none border border-outline-variant/20 focus:border-primary/50 transition-colors"
          placeholder="Provide more context..."
        ></textarea>
      </div>
      <button
        @click="addTicket"
        class="w-full bg-primary text-on-primary py-2.5 rounded-lg font-medium text-sm active:scale-95 transition-transform shadow-sm hover:bg-primary/90"
      >
        Create Ticket
      </button>
    </div>

    <!-- Kanban Board -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
      <div v-for="col in columns" :key="col.id" class="flex flex-col bg-surface-container-low rounded-xl border border-outline-variant/30 h-full overflow-hidden shadow-sm">
        <div class="p-4 bg-surface-container-highest/50 border-b border-outline-variant/20 flex justify-between items-center">
          <span class="text-xs font-semibold text-on-surface tracking-wide">{{ col.label }}</span>
          <span class="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">{{ getTicketsInColumn(col.id).length }}</span>
        </div>

        <div class="flex-1 p-3 space-y-3 overflow-y-auto min-h-[500px]">
          <div
            v-for="ticket in getTicketsInColumn(col.id)"
            :key="ticket.id"
            class="bg-surface-container-highest p-4 rounded-lg border border-outline-variant/20 group hover:border-primary/40 transition-all shadow-sm"
          >
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-sm font-medium text-on-surface leading-snug">{{ ticket.title }}</h3>
              <button @click="removeTicket(ticket.id)" class="material-symbols-outlined text-base text-on-surface-variant/40 opacity-0 group-hover:opacity-100 hover:text-error transition-all">delete</button>
            </div>
            <div v-if="ticket.projectId" class="mb-3">
              <span class="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded font-medium">
                {{ projects.find(p => p.id === ticket.projectId)?.name || 'Unknown Project' }}
              </span>
            </div>
            <p v-if="ticket.description" class="text-xs text-on-surface-variant leading-relaxed mb-4 line-clamp-3">{{ ticket.description }}</p>

            <div class="flex gap-2 justify-end pt-2 border-t border-outline-variant/10">
              <button
                v-for="nextCol in columns.filter(c => c.id !== col.id)"
                :key="nextCol.id"
                @click="moveTicket(ticket.id, nextCol.id)"
                class="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors px-1.5 py-0.5 rounded hover:bg-primary/5"
                :title="'Move to ' + nextCol.label"
              >
                {{ nextCol.label }}
              </button>
            </div>
          </div>

          <div v-if="getTicketsInColumn(col.id).length === 0" class="h-24 border border-dashed border-outline-variant/20 rounded-lg flex items-center justify-center bg-surface/30">
            <span class="text-[11px] font-medium text-on-surface-variant/40 tracking-tight">Empty Column</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(var(--primary), 0.1);
  border-radius: 10px;
}
</style>
