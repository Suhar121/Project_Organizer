<script setup lang="ts">
import { ref } from 'vue'
import type { PortEntry } from '../services/api'
import { setPortAlias } from '../services/api'

const props = defineProps<{
  filteredPorts: PortEntry[]
  isKillingPort: Record<number, boolean>
}>()

const emit = defineEmits<{
  (e: 'kill-process', pid: number, port: number): void
  (e: 'refresh'): void
}>()

const editingPort = ref<number | null>(null)
const aliasInput = ref('')

const startEdit = (port: number, currentAlias: string | null | undefined) => {
  editingPort.value = port
  aliasInput.value = currentAlias || ''
}

const saveAlias = async (port: number) => {
  try {
    await setPortAlias(port, aliasInput.value)
    editingPort.value = null
    emit('refresh')
  } catch (err) {
    console.error('Failed to save port alias:', err)
  }
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center gap-3 mb-2 px-1">
      <span class="material-symbols-outlined text-secondary text-xl">lan</span>
      <h3 class="text-sm font-bold text-on-surface tracking-tight">Active Network Sockets</h3>
    </div>
    <div class="bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-surface-container-low text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            <th class="px-6 py-3 border-b border-outline-variant/20">Port</th>
            <th class="px-6 py-3 border-b border-outline-variant/20">Alias / Process</th>
            <th class="px-6 py-3 border-b border-outline-variant/20 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="text-[12px] divide-y divide-outline-variant/10">
          <tr v-for="entry in filteredPorts.slice(0, 15)" :key="`${entry.port}-${entry.pid}`" class="hover:bg-surface-container-lowest transition-colors group">
            <td class="px-6 py-4 font-mono font-medium text-primary">
              <a :href="`http://localhost:${entry.port}`" target="_blank" class="hover:underline">
                {{ entry.port }}
              </a>
            </td>
            <td class="px-6 py-4 truncate max-w-[200px] font-medium text-on-surface">
              <div v-if="editingPort === entry.port" class="flex gap-2 items-center">
                <input
                  v-model="aliasInput"
                  class="bg-surface-container-highest border border-outline-variant/30 rounded px-2 py-1 outline-none text-[11px] w-full"
                  @keyup.enter="saveAlias(entry.port)"
                  autofocus
                />
                <button @click="saveAlias(entry.port)" class="material-symbols-outlined text-xs text-primary">check</button>
                <button @click="editingPort = null" class="material-symbols-outlined text-xs text-on-surface-variant">close</button>
              </div>
              <div v-else class="flex items-center gap-2">
                <span :class="entry.alias ? 'text-secondary font-bold' : 'text-on-surface-variant font-normal'">
                  {{ entry.alias || entry.processName }}
                </span>
                <button @click="startEdit(entry.port, entry.alias)" class="material-symbols-outlined text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">edit</button>
              </div>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                @click="$emit('kill-process', entry.pid, entry.port)"
                :disabled="isKillingPort[entry.port]"
                class="bg-error/10 text-error px-3 py-1 rounded-md text-[10px] font-bold hover:bg-error hover:text-white transition-all disabled:opacity-50"
              >
                {{ isKillingPort[entry.port] ? 'KILLING...' : 'TERMINATE' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredPorts.length === 0" class="p-8 text-center text-on-surface-variant italic text-xs">
        No active sockets detected.
      </div>
    </div>
  </section>
</template>
