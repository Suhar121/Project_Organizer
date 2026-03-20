<script setup lang="ts">
import type { PortEntry } from '../services/api'

defineProps<{
  filteredPorts: PortEntry[]
  isKillingPort: Record<number, boolean>
}>()

const emit = defineEmits<{
  (e: 'kill-process', pid: number, port: number): void
}>()
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
            <th class="px-6 py-3 border-b border-outline-variant/20">Process</th>
            <th class="px-6 py-3 border-b border-outline-variant/20 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="text-[12px] divide-y divide-outline-variant/10">
          <tr v-for="entry in filteredPorts.slice(0, 15)" :key="`${entry.port}-${entry.pid}`" class="hover:bg-surface-container-lowest transition-colors">
            <td class="px-6 py-4 font-mono font-medium text-primary">{{ entry.port }}</td>
            <td class="px-6 py-4 truncate max-w-[150px] font-medium text-on-surface">{{ entry.processName }}</td>
            <td class="px-6 py-4 text-right">
              <button
                @click="$emit('kill-process', entry.pid, entry.port)"
                :disabled="isKillingPort[entry.port]"
                class="bg-error/10 text-error px-3 py-1 rounded-md text-[10px] font-bold hover:bg-error hover:text-white transition-all disabled:opacity-50"
              >
                {{ isKillingPort[entry.port] ? 'KILING...' : 'TERMINATE' }}
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
