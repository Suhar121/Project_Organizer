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
  { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { id: 'kanban', label: 'KANBAN', icon: Trello },
  { id: 'notes', label: 'GLOBAL_NOTES', icon: NotebookPen },
  { id: 'activity', label: 'ACTIVITY_LOG', icon: Activity },
  { id: 'vault', label: 'SECRET_VAULT', icon: LockKeyhole }
]
</script>

<template>
  <aside class="w-64 bg-[#0b1326] border-r-2 border-primary/20 flex flex-col h-screen sticky top-0 z-50">
    <div class="px-6 py-8 border-b-2 border-primary/10 flex items-center gap-3">
      <Terminal class="text-primary h-6 w-6" />
      <h1 class="text-xl font-bold text-primary tracking-tighter font-headline uppercase italic">TACTICAL_OS</h1>
    </div>

    <nav class="flex-1 px-4 py-6 space-y-2">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="$emit('update:activePage', item.id)"
        class="w-full flex items-center gap-4 px-4 py-3 rounded-sm transition-all duration-200 group relative overflow-hidden"
        :class="activePage === item.id
          ? 'bg-primary/10 text-primary border-l-4 border-primary'
          : 'text-on-surface-variant hover:bg-white/5 hover:text-primary border-l-4 border-transparent'"
      >
        <component :is="item.icon" class="h-4 w-4" />
        <span class="font-headline text-[10px] font-bold uppercase tracking-widest">{{ item.label }}</span>

        <div
          v-if="activePage === item.id"
          class="absolute right-0 top-0 h-full w-1 bg-primary animate-pulse"
        ></div>
      </button>
    </nav>

    <div class="p-6 border-t-2 border-primary/10">
      <div class="flex flex-col gap-2 opacity-50">
        <span class="text-[8px] font-mono text-primary uppercase">SYSTEM_STATE: OPERATIONAL</span>
        <div class="h-1 bg-surface-container-highest w-full rounded-full overflow-hidden">
          <div class="h-full bg-primary w-2/3 animate-pulse"></div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.font-headline {
  font-family: 'Space Grotesk', sans-serif;
}
</style>
