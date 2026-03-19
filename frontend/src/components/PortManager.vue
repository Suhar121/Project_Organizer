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
    <div class="flex items-center gap-3 mb-2">
      <span class="material-symbols-outlined text-secondary">lan</span>
      <h3 class="font-label text-sm font-bold uppercase tracking-widest text-on-surface">NETWORK_SOCKETS</h3>
    </div>
    <div class="bg-surface-container-low overflow-hidden border-t-2 border-secondary/30">
      <table class="w-full text-left">
        <thead>
          <tr class="bg-surface-container-highest text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
            <th class="px-4 py-2">PORT</th>
            <th class="px-4 py-2">PROCESS</th>
            <th class="px-4 py-2 text-right">ACTION</th>
          </tr>
        </thead>
        <tbody class="text-[11px] font-mono divide-y divide-outline-variant/10">
          <tr v-for="entry in filteredPorts.slice(0, 15)" :key="`${entry.port}-${entry.pid}`" class="hover:bg-surface-container transition-colors">
            <td class="px-4 py-3 text-primary">{{ entry.port }}</td>
            <td class="px-4 py-3 truncate max-w-[120px]">{{ entry.processName }}</td>
            <td class="px-4 py-3 text-right">
              <button
                @click="$emit('kill-process', entry.pid, entry.port)"
                :disabled="isKillingPort[entry.port]"
                class="text-secondary hover:underline uppercase font-bold text-[9px]"
              >
                {{ isKillingPort[entry.port] ? '...' : 'KILL' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
