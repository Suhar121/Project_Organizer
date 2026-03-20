<script setup lang="ts">
import { GitBranch, RefreshCw, CheckCircle, AlertCircle, ArrowUpCircle } from 'lucide-vue-next'
import type { Project } from '../services/api'

defineProps<{
  projects: Project[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh-all'): void
}>()
</script>

<template>
  <div class="space-y-8">
    <div class="flex justify-between items-center">
      <h1 class="font-headline text-3xl font-bold text-primary uppercase italic tracking-tighter">GIT_HEALTH_PROTOCOL</h1>
      <button
        @click="$emit('refresh-all')"
        :disabled="isLoading"
        class="bg-secondary text-on-secondary px-4 py-2 font-headline uppercase tracking-widest text-xs font-bold active:scale-95 transition-all flex items-center gap-2"
      >
        <RefreshCw class="h-3 w-3" :class="isLoading ? 'animate-spin' : ''" />
        RESCAN_ALL
      </button>
    </div>

    <div class="bg-surface-container-low border-t-2 border-primary/20 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-surface-container-highest border-b border-primary/10">
            <th class="px-6 py-4 text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">PROJECT_IDENTIFIER</th>
            <th class="px-6 py-4 text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">ACTIVE_BRANCH</th>
            <th class="px-6 py-4 text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant text-center">LOCAL_STATE</th>
            <th class="px-6 py-4 text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant text-center">UPSTREAM_SYNC</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-primary/5">
          <tr v-for="project in projects" :key="project.id" class="hover:bg-primary/5 transition-colors">
            <td class="px-6 py-4">
              <div class="flex flex-col">
                <span class="text-xs font-bold uppercase text-on-surface">{{ project.name }}</span>
                <span class="text-[8px] font-mono text-outline-variant truncate max-w-[200px]">{{ project.path }}</span>
              </div>
            </td>
            <td class="px-6 py-4">
              <div v-if="project.git?.isGitRepo" class="flex items-center gap-2">
                <GitBranch class="h-3 w-3 text-primary" />
                <span class="text-xs font-mono text-primary font-bold">{{ project.git.branch || 'DETACHED' }}</span>
              </div>
              <span v-else class="text-[10px] font-label text-outline-variant opacity-30 uppercase italic">NON_GIT_DIR</span>
            </td>
            <td class="px-6 py-4">
               <div v-if="project.git?.isGitRepo" class="flex justify-center">
                 <div v-if="project.git.hasUncommittedChanges" class="flex items-center gap-1.5 text-secondary">
                   <AlertCircle class="h-3 w-3" />
                   <span class="text-[9px] font-bold uppercase">DIRTY_WORKING_TREE</span>
                 </div>
                 <div v-else class="flex items-center gap-1.5 text-primary opacity-60">
                   <CheckCircle class="h-3 w-3" />
                   <span class="text-[9px] font-bold uppercase">CLEAN</span>
                 </div>
               </div>
            </td>
            <td class="px-6 py-4">
              <div v-if="project.git?.isGitRepo" class="flex justify-center">
                 <div v-if="project.git.needsPush" class="flex items-center gap-1.5 text-primary">
                   <ArrowUpCircle class="h-3 w-3" />
                   <span class="text-[9px] font-bold uppercase font-black underline underline-offset-2">PUSH_PENDING</span>
                 </div>
                 <div v-else class="flex items-center gap-1.5 text-outline-variant opacity-40">
                   <CheckCircle class="h-3 w-3" />
                   <span class="text-[9px] font-bold uppercase">SYNCHRONIZED</span>
                 </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="projects.length === 0" class="p-20 text-center border-t border-primary/5">
        <span class="text-[10px] font-label uppercase text-outline-variant opacity-40 tracking-[0.2em]">WAITING_FOR_DATA_STREAM...</span>
      </div>
    </div>

    <!-- Git Tactical Legend -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div class="p-4 bg-surface-container-low border-l-2 border-primary/20 space-y-2">
         <h4 class="text-[8px] font-label font-bold text-on-surface-variant uppercase">LOCAL_STATE_LEGEND</h4>
         <div class="flex items-center gap-2">
           <div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
           <span class="text-[8px] font-mono text-outline-variant">CLEAN: Working tree matches HEAD</span>
         </div>
         <div class="flex items-center gap-2">
           <div class="h-1.5 w-1.5 rounded-full bg-secondary"></div>
           <span class="text-[8px] font-mono text-outline-variant">DIRTY: Uncommitted modifications detected</span>
         </div>
       </div>
    </div>
  </div>
</template>
