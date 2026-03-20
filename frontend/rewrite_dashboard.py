import re

with open('d:/local-dashboard/dev-dashboard/frontend/src/pages/Dashboard.vue', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Replace the entire <template> block to match the Tactical OS layout.
# We'll maintain the script logic but rebuild the visual structure.

new_template = """<template>
  <div class="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-surface text-on-surface font-body selection:bg-primary/30 pb-20 md:pb-0">
    <!-- TopAppBar -->
    <header class="flex justify-between items-center w-full px-6 py-4 bg-[#0b1326] border-l-4 border-primary sticky top-0 z-50">
      <div class="flex items-center gap-4">
        <span class="material-symbols-outlined text-primary">terminal</span>
        <h1 class="text-xl font-bold text-primary tracking-tighter font-headline uppercase italic">TACTICAL_OS</h1>

        <!-- Desktop Nav -->
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
          <input v-model="search" class="w-full bg-surface-container-highest border-l-2 border-transparent focus:border-primary px-10 py-2 font-label text-xs uppercase tracking-wider outline-none transition-all placeholder:text-outline/50" placeholder="GLOBAL_SEARCH [CTRL+K]" type="text"/>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button @click="isAddDialogOpen = true" class="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 font-headline uppercase tracking-[0.05rem] text-sm font-bold active:scale-95 duration-200 transition-colors hover:bg-primary-container">
          <span class="material-symbols-outlined text-sm">add_box</span>
          NEW_PROJECT
        </button>
        <button @click="refreshOpsData" class="p-2 text-primary hover:bg-primary/10 transition-colors">
          <RefreshCw class="h-5 w-5" :class="isSystemLoading ? 'animate-spin' : ''" />
        </button>
      </div>
    </header>

    <main class="p-6 space-y-8 max-w-[1600px] mx-auto w-full">
      <template v-if="activePage === 'dashboard'">
        <!-- Hero Metrics -->
        <section class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="md:col-span-2 bg-surface-container-low p-6 relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <div class="flex justify-between items-start mb-4">
              <span class="font-label text-xs uppercase text-on-surface-variant tracking-widest">CPU_LOAD_TELEMETRY</span>
              <span class="material-symbols-outlined text-primary text-xl">speed</span>
            </div>
            <div class="flex items-baseline gap-2">
              <h2 class="font-headline text-5xl font-bold text-primary tracking-tighter">{{ systemOverview?.cpuUsagePercent ?? '0.0' }}</h2>
              <span class="font-headline text-xl text-primary/60">%</span>
            </div>
            <div class="mt-4 h-1 bg-surface-container-highest w-full overflow-hidden">
              <div class="h-full bg-primary transition-all duration-500" :style="{ width: `${systemOverview?.cpuUsagePercent ?? 0}%` }"></div>
            </div>
            <div class="mt-2 flex justify-between font-label text-[10px] text-on-surface-variant uppercase">
              <span>CORE_STABILITY: OPTIMAL</span>
              <span>UPTIME: {{ formatTimeAgo(systemOverview?.timestamp || '') }}</span>
            </div>
          </div>

          <div class="md:col-span-2 bg-surface-container-low p-6 relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
            <div class="flex justify-between items-start mb-4">
              <span class="font-label text-xs uppercase text-on-surface-variant tracking-widest">MEMORY_UTILIZATION</span>
              <span class="material-symbols-outlined text-secondary text-xl">memory</span>
            </div>
            <div class="flex items-baseline gap-2">
              <h2 class="font-headline text-5xl font-bold text-secondary tracking-tighter">{{ systemOverview?.memory.usedGb ?? '0.0' }}</h2>
              <span class="font-headline text-xl text-secondary/60">GB</span>
            </div>
            <div class="mt-4 h-1 bg-surface-container-highest w-full overflow-hidden">
              <div class="h-full bg-secondary transition-all duration-500" :style="{ width: `${systemOverview?.memory.usagePercent ?? 0}%` }"></div>
            </div>
            <div class="mt-2 flex justify-between font-label text-[10px] text-on-surface-variant uppercase">
              <span>TOTAL_CAPACITY: {{ systemOverview?.memory.totalGb ?? '0' }} GB</span>
              <span>STATE: STABLE</span>
            </div>
          </div>
        </section>

        <!-- Recent Projects Strip -->
        <RecentProjectsBar
          v-if="recentProjects.length > 0"
          :projects="recentProjects"
          :is-project-running="isProjectRunning"
          @action-executed="loadProjects(); loadActivity(); refreshRunningProcesses()"
          @project-clicked="(p) => { search = p.name }"
        />

        <!-- Main Dashboard Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Project Library -->
          <section class="lg:col-span-2 space-y-4">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary">folder_open</span>
                <h3 class="font-label text-sm font-bold uppercase tracking-widest text-on-surface">PROJECT_LIBRARY</h3>
              </div>
              <div v-if="availableTags.length > 0" class="flex gap-2">
                <button
                  v-for="tag in availableTags"
                  :key="tag"
                  @click="toggleTagFilter(tag)"
                  class="bg-surface-container-highest px-3 py-1 text-[9px] font-label font-bold uppercase transition-colors"
                  :class="tagFilter === tag ? 'text-primary border-b border-primary' : 'text-on-surface-variant hover:text-primary'"
                >
                  {{ tag }}
                </button>
              </div>
            </div>

            <div v-if="filteredProjects.length === 0" class="bg-surface-container-low p-12 text-center border border-dashed border-outline-variant">
              <span class="material-symbols-outlined text-4xl text-outline-variant mb-4">inventory_2</span>
              <p class="font-label text-sm uppercase text-on-surface-variant">NO_MATCHING_PROJECTS_FOUND</p>
            </div>

            <div class="space-y-3">
              <ProjectCard
                v-for="project in filteredProjects"
                :key="project.id"
                :project="project"
                :is-running="isProjectRunning(project.id)"
                @deleted="loadProjects"
                @updated="loadProjects"
                @edit="openEditDialog"
              />
            </div>
          </section>

          <!-- NETWORK_SOCKETS & Logs -->
          <aside class="space-y-8">
            <section class="space-y-4">
              <div class="flex items-center gap-3 mb-2">
                <span class="material-symbols-outlined text-secondary">lan</span>
                <h3 class="font-label text-sm font-bold uppercase tracking-widest text-on-surface">NETWORK_SOCKETS</h3>
              </div>
              <div class="bg-surface-container-low overflow-hidden border-t-2 border-secondary/30">
                <table class="w-full text-left">
                  <thead>
                    <tr class="bg-surface-container-highest text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                      <th class="px-4 py-2 font-medium">PORT</th>
                      <th class="px-4 py-2 font-medium">PROCESS</th>
                      <th class="px-4 py-2 font-medium text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody class="text-[11px] font-mono divide-y divide-outline-variant/10">
                    <tr v-for="entry in filteredPorts.slice(0, 15)" :key="`${entry.port}-${entry.pid}`" class="hover:bg-surface-container transition-colors">
                      <td class="px-4 py-3 text-primary">{{ entry.port }}</td>
                      <td class="px-4 py-3 truncate max-w-[120px]">{{ entry.processName }}</td>
                      <td class="px-4 py-3 text-right">
                        <button
                          @click="handleKillProcess(entry.pid, entry.port)"
                          :disabled="isKillingPort[entry.port]"
                          class="text-secondary hover:underline transition-colors uppercase font-bold text-[9px]"
                        >
                          {{ isKillingPort[entry.port] ? '...' : 'KILL' }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-if="filteredPorts.length === 0" class="p-4 text-center text-[10px] uppercase text-outline-variant font-label">NO_ACTIVE_SOCKETS</div>
              </div>
            </section>

            <!-- System Logs Preview -->
            <section class="bg-surface-container-highest p-4 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-label font-bold text-on-surface-variant uppercase">SYSTEM_LOGS_PREVIEW</span>
                <span class="flex h-2 w-2 rounded-full" :class="isActivityLoading ? 'bg-secondary animate-pulse' : 'bg-primary'"></span>
              </div>
              <div class="font-mono text-[10px] space-y-1 text-on-surface-variant opacity-80 overflow-hidden max-h-[160px] hide-scrollbar overflow-y-auto">
                <p v-for="entry in activityEntries.slice(0, 8)" :key="entry.id" :class="entry.status === 'error' ? 'text-error' : 'text-primary/70'">
                  [{{ formatTimeAgo(entry.timestamp) }}] {{ entry.action.toUpperCase() }}: {{ entry.projectName || entry.path }}
                </p>
                <p v-if="activityEntries.length === 0" class="text-outline-variant font-italic">No logs recorded.</p>
              </div>
            </section>

            <ProjectStatsCard
              v-if="projects.length > 0"
              :projects="projects"
              :activity-entries="activityEntries"
              :running-count="getRunningCount()"
              class="bg-surface-container-low p-4 border border-outline-variant/20"
            />
          </aside>
        </div>
      </template>

      <!-- Global Notes View (Placeholder restyle) -->
      <template v-else-if="activePage === 'notes'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-4">
              <h1 class="font-headline text-2xl font-bold text-primary italic uppercase tracking-tighter">SCRATCHPAD</h1>
              <textarea
                v-model="scratchpad"
                @input="saveScratchpad"
                class="w-full h-[600px] bg-surface-container-low p-6 font-mono text-sm border-l-2 border-primary outline-none focus:bg-surface-container-high transition-colors resize-none"
                placeholder="READY_FOR_INPUT..."
              ></textarea>
            </div>
            <div class="space-y-4">
              <h1 class="font-headline text-2xl font-bold text-secondary italic uppercase tracking-tighter">OPERATIONAL_TASKS</h1>
              <div class="bg-surface-container-low p-6 h-[600px] overflow-y-auto space-y-4 border-l-2 border-secondary">
                 <div class="flex gap-2 mb-4">
                   <input v-model="newTodoTitle" @keyup.enter="addTodo" class="flex-1 bg-surface-container-highest px-4 py-2 outline-none font-label uppercase text-xs" placeholder="NEW_TASK_ENTRY..." />
                   <button @click="addTodo" class="bg-secondary text-on-secondary px-6 font-bold uppercase text-[10px]">COMMIT</button>
                 </div>
                 <div v-for="todo in todos" :key="todo.id" class="flex items-center justify-between p-3 bg-surface-container-highest group">
                   <div class="flex items-center gap-3">
                     <button @click="moveTodo(todo, todo.status === 'done' ? 'todo' : 'done')" class="material-symbols-outlined text-sm" :class="todo.status === 'done' ? 'text-secondary' : 'text-outline-variant'">{{ todo.status === 'done' ? 'check_box' : 'check_box_outline_blank' }}</button>
                     <span :class="todo.status === 'done' ? 'line-through text-outline-variant' : ''" class="text-xs uppercase font-label">{{ todo.title }}</span>
                   </div>
                   <button @click="removeTodo(todo.id)" class="material-symbols-outlined text-xs text-outline-variant opacity-0 group-hover:opacity-100 hover:text-error transition-all">delete</button>
                 </div>
              </div>
            </div>
          </div>
      </template>

      <!-- Activity Log & Vault (Compact Layouts) -->
      <template v-else-if="activePage === 'activity'">
          <div class="bg-surface-container-low p-8 border-l-4 border-primary">
            <h1 class="font-headline text-3xl font-bold text-primary italic uppercase tracking-tighter mb-8">GLOBAL_ACTIVITY_LOG</h1>
            <div class="space-y-2">
               <div v-for="entry in activityEntries" :key="entry.id" class="flex items-center gap-4 py-2 border-b border-outline-variant/10 text-xs font-mono">
                  <span class="text-outline-variant w-24">[{{ formatTimeAgo(entry.timestamp) }}]</span>
                  <span :class="entry.status === 'error' ? 'text-error' : 'text-primary'" class="font-bold w-32">[{{ entry.action.toUpperCase() }}]</span>
                  <span class="text-on-surface truncate flex-1">{{ entry.projectName || entry.path }}</span>
                  <span class="text-outline-variant">{{ entry.details }}</span>
               </div>
            </div>
          </div>
      </template>

      <template v-else-if="activePage === 'vault'">
          <div class="max-w-4xl mx-auto space-y-8">
            <h1 class="font-headline text-3xl font-bold text-secondary italic uppercase tracking-tighter text-center">ENCRYPTED_VAULT_INTERFACE</h1>

            <div v-if="!vaultHasSetup" class="bg-surface-container-low p-8 border-t-2 border-secondary">
               <p class="font-label text-xs uppercase text-on-surface-variant mb-4">INITIALIZE_MASTER_KEY</p>
               <input v-model="vaultSetupPassword" type="password" placeholder="MASTER_KEY..." class="w-full bg-surface-container-highest p-4 outline-none mb-2" />
               <input v-model="vaultSetupConfirm" type="password" placeholder="CONFIRM_MASTER_KEY..." class="w-full bg-surface-container-highest p-4 outline-none mb-4" />
               <Button class="w-full h-12" @click="setupVault">EXECUTE_INITIALIZATION</Button>
            </div>

            <div v-else-if="!vaultIsUnlocked" class="bg-surface-container-low p-8 border-t-2 border-secondary">
               <p class="font-label text-xs uppercase text-on-surface-variant mb-4">AUTHORIZATION_REQUIRED</p>
               <input v-model="vaultUnlockPassword" @keyup.enter="unlockVault" type="password" placeholder="ENTER_MASTER_KEY..." class="w-full bg-surface-container-highest p-4 outline-none mb-4" />
               <Button class="w-full h-12" @click="unlockVault">AUTHORIZE_ACCESS</Button>
            </div>

            <div v-else class="space-y-6">
               <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div class="bg-surface-container-low p-6 space-y-4">
                    <h3 class="font-label text-xs font-bold uppercase text-primary">NEW_SECRET_ENTRY</h3>
                    <input v-model="vaultLabel" placeholder="SECRET_LABEL..." class="w-full bg-surface-container-highest p-3 outline-none text-xs" />
                    <input v-model="vaultValue" placeholder="SECRET_VALUE..." class="w-full bg-surface-container-highest p-3 outline-none text-xs" />
                    <Button class="w-full" @click="addVaultSecret">COMMIT_SECRET</Button>
                 </div>
                 <div class="bg-surface-container-low p-6 space-y-4">
                    <h3 class="font-label text-xs font-bold uppercase text-secondary">VAULT_REGISTRY</h3>
                    <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2 hide-scrollbar">
                       <div v-for="secret in vaultSecrets" :key="secret.id" class="p-3 bg-surface-container-highest flex items-center justify-between">
                          <div class="flex-1">
                             <p class="text-[10px] font-bold text-on-surface uppercase">{{ secret.label }}</p>
                             <p class="text-[9px] font-mono text-outline-variant">{{ visibleSecretIds[secret.id] ? secret.value : '********' }}</p>
                          </div>
                          <div class="flex gap-2">
                             <button @click="toggleSecretVisibility(secret.id)" class="material-symbols-outlined text-xs text-outline">{{ visibleSecretIds[secret.id] ? 'visibility_off' : 'visibility' }}</button>
                             <button @click="removeVaultSecret(secret.id)" class="material-symbols-outlined text-xs text-outline hover:text-error">delete</button>
                          </div>
                       </div>
                       <p v-if="vaultSecrets.length === 0" class="text-center text-[10px] uppercase text-outline-variant py-8">REGISTRY_EMPTY</p>
                    </div>
                 </div>
               </div>
            </div>
          </div>
      </template>

    </main>

    <!-- BottomNavBar (Mobile Only) -->
    <nav class="md:hidden fixed bottom-16 left-0 w-full z-10 flex justify-around items-center h-16 bg-[#0b1326] border-t border-outline-variant/30">
      <button @click="activePage = 'dashboard'" :class="[activePage === 'dashboard' ? 'text-primary' : 'text-on-surface-variant']" class="flex flex-col items-center justify-center p-2">
        <span class="material-symbols-outlined">grid_view</span>
        <span class="font-headline uppercase text-[9px] tracking-widest">DASHBOARD</span>
      </button>
      <button @click="activePage = 'notes'" :class="[activePage === 'notes' ? 'text-primary' : 'text-on-surface-variant']" class="flex flex-col items-center justify-center p-2">
        <span class="material-symbols-outlined">description</span>
        <span class="font-headline uppercase text-[9px] tracking-widest">NOTES</span>
      </button>
      <button @click="activePage = 'activity'" :class="[activePage === 'activity' ? 'text-primary' : 'text-on-surface-variant']" class="flex flex-col items-center justify-center p-2">
        <span class="material-symbols-outlined">insights</span>
        <span class="font-headline uppercase text-[9px] tracking-widest">ACTIVITY</span>
      </button>
      <button @click="activePage = 'vault'" :class="[activePage === 'vault' ? 'text-primary' : 'text-on-surface-variant']" class="flex flex-col items-center justify-center p-2">
        <span class="material-symbols-outlined">lock</span>
        <span class="font-headline uppercase text-[9px] tracking-widest">VAULT</span>
      </button>
    </nav>

    <AddProjectDialog v-model:open="isAddDialogOpen" @added="loadProjects" />
    <EditProjectDialog v-model:open="isEditDialogOpen" :project="projectToEdit" @updated="loadProjects" />
    <CommandPalette
      v-model:open="isCommandPaletteOpen"
      :projects="projects"
      @action-executed="loadProjects(); loadActivity(); refreshRunningProcesses()"
    />
  </div>
</template>"""

# Replace the old template with new_template
text = re.sub(r'<template>.*?</template>', new_template, text, flags=re.DOTALL)

with open('d:/local-dashboard/dev-dashboard/frontend/src/pages/Dashboard.vue', 'w', encoding='utf-8') as f:
    f.write(text)

print('Success rewriting Dashboard to Tactical OS.')
