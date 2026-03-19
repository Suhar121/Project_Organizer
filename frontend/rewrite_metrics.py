import re

with open('d:/local-dashboard/dev-dashboard/frontend/src/pages/Dashboard.vue', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the grid-cols-1 md:grid-cols-12 block with the new grid-cols-2 gap-20 layout
old_block_pattern = re.compile(r'<div class="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">.*?(?=          <div class="mb-12">)', re.DOTALL)

new_block = """<div class="grid grid-cols-2 gap-20 mb-16">
            <div class="flex flex-col">
              <span class="text-[var(--color-accent-cyan)] text-[10px] font-black uppercase tracking-[0.3em] mb-4">CPU Utilization</span>
              <div class="flex items-baseline gap-2">
                <h1 class="text-white text-8xl font-black tracking-tighter">
                  <span v-if="systemOverview">{{ systemOverview.cpuUsagePercent ?? '--' }}</span>
                  <span v-else>--</span>
                </h1>
                <span class="text-[var(--color-accent-pink)] text-3xl font-bold tracking-tighter">%</span>
              </div>
              <div class="h-1 w-full bg-[var(--color-primary)]/10 mt-6 rounded-full overflow-hidden">
                <div class="h-full bg-[var(--color-accent-cyan)] shadow-[0_0_15px_rgba(0,245,255,0.5)]" :style="{ width: `${systemOverview?.cpuUsagePercent ?? 0}%` }"></div>
              </div>
            </div>

            <div class="flex flex-col">
              <span class="text-[var(--color-accent-pink)] text-[10px] font-black uppercase tracking-[0.3em] mb-4">Memory Alloc</span>
              <div class="flex items-baseline gap-2">
                <h1 class="text-white text-8xl font-black tracking-tighter">
                  <span v-if="systemOverview">{{ systemOverview.memory.usedGb }}</span>
                  <span v-else>--</span>
                </h1>
                <span class="text-[var(--color-accent-cyan)] text-3xl font-bold tracking-tighter">GB</span>
              </div>
              <div class="flex gap-1 mt-6 h-1 w-full">
                <div class="h-full bg-[var(--color-accent-pink)] transition-all" :style="{ width: `${systemOverview?.memory.usagePercent ?? 0}%` }"></div>
                <div class="h-full flex-1 bg-[var(--color-primary)]/10"></div>
              </div>
            </div>
          </div>
"""

text = old_block_pattern.sub(new_block, text)

# Also update the Port Manager to look like the Network Interfaces block from the template.
# "Network Interfaces" with text-white text-xl font-black tracking-tighter uppercase italic
# And the table styling: border-primary/20, py-5, font-bold text-sm text-slate-200.

port_manager_pattern = re.compile(r'<Card class="mb-12 border-0 shadow-none ring-1 ring-transparent hover:ring-\[var\(--accent-color-soft\)\] bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col max-h-\[600px\] transition-all duration-300 ease-out-quart hover:shadow-2xl hover:-translate-y-1 hover:shadow-\[var\(--accent-color-soft\)\]">.*?</Card>', re.DOTALL)

port_manager_new = """<div class="flex flex-col gap-6 mb-12">
            <div class="flex items-center justify-between">
              <h2 class="text-white text-xl font-black tracking-tighter uppercase italic">Network Interfaces & Ports</h2>
              <div class="flex gap-4">
                <Input v-model="portSearch" placeholder="Filter ports..." class="w-full sm:w-64 h-9 bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20 text-xs tracking-widest uppercase rounded-lg" />
                <button @click="loadPorts" class="px-6 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 transition-all text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                  {{ isPortsLoading ? 'Scanning...' : 'Scan Ports' }}
                </button>
              </div>
            </div>

            <div class="overflow-x-auto hide-scrollbar">
              <table class="w-full text-left border-collapse">
                <thead class="border-b border-[var(--color-primary)]/20">
                  <tr>
                    <th class="py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Port</th>
                    <th class="py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Protocol</th>
                    <th class="py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Service / Process</th>
                    <th class="py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Project Binding</th>
                    <th class="py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-primary)]/5">
                  <tr v-for="entry in filteredPorts.slice(0, 100)" :key="`${entry.port}-${entry.pid}`" class="group hover:bg-[var(--color-primary)]/5 transition-colors">
                    <td class="py-5 font-bold text-sm text-slate-200 font-mono">{{ entry.port }}</td>
                    <td class="py-5 text-center">
                      <span class="px-2 py-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] font-black uppercase rounded">{{ entry.host === '::' ? 'TCP6' : 'TCP4' }}</span>
                    </td>
                    <td class="py-5 text-sm text-slate-200">
                      {{ entry.processName }} <span class="text-slate-500 text-xs font-mono ml-2">PID:{{ entry.pid }}</span>
                    </td>
                    <td class="py-5 text-sm text-slate-200">
                      <span v-if="entry.projectName" class="px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-accent-cyan)] text-[10px] font-black uppercase tracking-widest rounded border border-[var(--color-primary)]/20 shadow-[0_0_10px_rgba(0,245,255,0.1)]">{{ entry.projectName }}</span>
                      <span v-else class="text-slate-600 font-mono text-xs">Unbound</span>
                    </td>
                    <td class="py-5 text-right">
                      <span class="flex items-center justify-end gap-2 text-[var(--color-accent-cyan)] text-[10px] font-black uppercase tracking-widest group-hover:hidden">
                        <span class="size-1.5 rounded-full bg-[var(--color-accent-cyan)] animate-pulse"></span> ACTIVE
                      </span>
                      <button
                        class="hidden group-hover:flex items-center justify-end w-full gap-2 text-[var(--color-accent-pink)] text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                        title="Kill Process"
                        :disabled="isKillingPort[entry.port]"
                        @click="handleKillProcess(entry.pid, entry.port)"
                      >
                        <Trash2 class="h-3 w-3" :class="isKillingPort[entry.port] ? 'animate-pulse' : ''" /> TERMINATE
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="filteredPorts.length === 0" class="text-center py-12 text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">
               No active connections matching filters.
            </div>
          </div>"""

text = port_manager_pattern.sub(port_manager_new, text)

with open('d:/local-dashboard/dev-dashboard/frontend/src/pages/Dashboard.vue', 'w', encoding='utf-8') as f:
    f.write(text)

print('Success replacing CPU/Memory and Port Manager')
