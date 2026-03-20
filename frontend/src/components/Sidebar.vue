<script setup lang="ts">
import {
  LayoutDashboard,
  Trello,
  NotebookPen,
  Activity,
  LockKeyhole,
  Terminal,
  Globe,
  GitGraph
} from 'lucide-vue-next'

type AppPage = 'dashboard' | 'notes' | 'activity' | 'vault' | 'kanban'

defineProps<{
  activePage: AppPage
}>()

const emit = defineEmits<{
  (e: 'update:activePage', value: AppPage): void
}>()

const navItems: { id: AppPage; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'kanban', label: 'Kanban', icon: Trello },
  { id: 'notes', label: 'Global Notes', icon: NotebookPen },
  { id: 'activity', label: 'Activity Log', icon: Activity },
  { id: 'vault', label: 'Secret Vault', icon: LockKeyhole }
]
</script>

<template>
  <aside class="w-64 bg-surface border-r border-outline-variant/30 flex flex-col h-screen sticky top-0 z-50">
    <div class="px-6 py-6 border-b border-outline-variant/20 flex items-center gap-3">
      <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
        <Terminal class="text-white h-5 w-5" />
      </div>
      <h1 class="text-lg font-semibold text-on-surface tracking-tight">DevDash</h1>
    </div>

    <nav class="flex-1 px-3 py-6 space-y-1">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="$emit('update:activePage', item.id)"
        class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200"
        :class="activePage === item.id
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'"
      >
        <component :is="item.icon" class="h-4 w-4" />
        <span class="text-sm">{{ item.label }}</span>
      </button>
    </nav>

    <div class="p-6 border-t border-outline-variant/20">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between text-[10px] font-medium text-on-surface-variant uppercase">
          <span>System Status</span>
          <span class="text-tertiary">Operational</span>
        </div>
        <div class="h-1.5 bg-surface-container-highest w-full rounded-full overflow-hidden">
          <div class="h-full bg-primary w-full opacity-80"></div>
        </div>
      </div>
    </div>
  </aside>
</template>
