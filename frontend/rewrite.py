import re

with open('d:/local-dashboard/dev-dashboard/frontend/src/pages/Dashboard.vue', 'r', encoding='utf-8') as f:
    text = f.read()

template_match = re.search(r'<template>.*?</template>', text, re.DOTALL)
if not template_match:
    print('Template not found')
    exit(1)

template_str = template_match.group(0)

new_header = """<template>
  <div class="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[var(--color-background-dark)] text-slate-100 font-display selection:bg-[var(--color-accent-cyan)]/30">
    <header class="flex items-center justify-between px-12 py-8 border-b border-[var(--color-primary)]/10">
      <div class="flex items-center gap-12">
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-accent-pink)] rounded-lg flex items-center justify-center">
            <Layers class="text-white h-5 w-5" />
          </div>
          <h2 class="text-white text-xl font-black tracking-tighter uppercase italic pr-8">Local Dash</h2>
        </div>
        <nav class="hidden md:flex items-center gap-10">
          <a href="#" @click.prevent="activePage = 'dashboard'" :class="[activePage === 'dashboard' ? 'text-[var(--color-accent-cyan)] border-b-2 border-[var(--color-accent-cyan)]' : 'text-slate-400 hover:text-white', 'text-xs font-bold uppercase tracking-widest pb-1 transition-colors']">Dashboard</a>
          <a href="#" @click.prevent="activePage = 'notes'" :class="[activePage === 'notes' ? 'text-[var(--color-accent-cyan)] border-b-2 border-[var(--color-accent-cyan)]' : 'text-slate-400 hover:text-white', 'text-xs font-bold uppercase tracking-widest pb-1 transition-colors']">Global Notes</a>
          <a href="#" @click.prevent="activePage = 'activity'" :class="[activePage === 'activity' ? 'text-[var(--color-accent-cyan)] border-b-2 border-[var(--color-accent-cyan)]' : 'text-slate-400 hover:text-white', 'text-xs font-bold uppercase tracking-widest pb-1 transition-colors']">Activity Log</a>
          <a href="#" @click.prevent="activePage = 'vault'" :class="[activePage === 'vault' ? 'text-[var(--color-accent-cyan)] border-b-2 border-[var(--color-accent-cyan)]' : 'text-slate-400 hover:text-white', 'text-xs font-bold uppercase tracking-widest pb-1 transition-colors']">Secret Vault</a>
        </nav>
      </div>
      <div class="flex items-center gap-6">
        <div class="relative hidden lg:block">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
          <input v-model="search" class="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-lg pl-10 pr-4 py-2 text-xs font-bold tracking-widest focus:ring-1 focus:ring-[var(--color-accent-cyan)] outline-none w-64 text-white uppercase placeholder:text-slate-600" placeholder="COMMAND / SEARCH" type="text"/>
        </div>
        <button @click="isAddDialogOpen = true" class="px-6 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 transition-all text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center shadow-[0_0_15px_rgba(138,44,226,0.5)]">
          <Plus class="mr-2 h-4 w-4" /> New Project
        </button>
        <button @click="refreshOpsData" class="h-10 w-10 flex items-center justify-center rounded-full hover:bg-[var(--color-primary)]/20 transition-all text-[var(--color-accent-cyan)] border-2 border-[var(--color-accent-cyan)]">
          <RefreshCw class="h-4 w-4" />
        </button>
      </div>
    </header>

    <main class="flex-1 px-12 py-10 min-w-0">
      <div class="grid-asymmetric max-w-[1920px] mx-auto w-full">
        <section class="flex flex-col gap-16 min-w-0">"""

# Replace the old sidebar + header wrapper with the new top nav structure
old_header_pattern = re.compile(r'<template>.*?<div class="p-\[var\(--space-xl\)\] flex-1 overflow-auto bg-transparent">', re.DOTALL)
text = text.replace(old_header_pattern.search(text).group(0), new_header)

new_foot = """        </section>

        <!-- Right Sidebar for Live Feed (Threat shield/Activity) -->
        <aside class="flex flex-col gap-10 shrink-0 w-[350px]">
          <div class="flex items-center justify-between border-b border-[var(--color-primary)]/20 pb-4">
            <h3 class="text-white text-xs font-black uppercase tracking-[0.3em]">Live Feed</h3>
            <Activity class="text-[var(--color-accent-cyan)] h-4 w-4" />
          </div>

          <div class="flex flex-col gap-6 max-h-[600px] overflow-y-auto hide-scrollbar" v-if="activityEntries.length > 0">
             <div v-for="entry in activityEntries.slice(0, 15)" :key="entry.id" class="flex flex-col gap-2 relative pl-6 border-l border-[var(--color-primary)]/20">
                <span class="absolute left-[-4.5px] top-0 h-2 w-2 rounded-full" :class="entry.status === 'success' ? 'bg-[var(--color-accent-cyan)]' : 'bg-[var(--color-accent-pink)]'"></span>
                <span class="text-slate-500 text-[10px] font-mono">{{ formatTimeAgo(entry.timestamp) }}</span>
                <p class="text-slate-200 text-xs font-medium leading-relaxed">
                  <span class="font-black" :class="entry.status === 'success' ? 'text-[var(--color-accent-cyan)]' : 'text-[var(--color-accent-pink)]'">{{ activityActionLabel(entry.action).toUpperCase() }}</span>
                  <span class="text-[var(--color-primary)] italic">{{ entry.projectName || entry.path }}</span> - {{ entry.details }}
                </p>
             </div>
          </div>
          <div v-else class="text-[10px] text-slate-500 font-mono uppercase tracking-widest p-4">No activity recorded...</div>

          <div class="mt-auto p-6 bg-[var(--color-primary)]/5 rounded-xl flex flex-col gap-4 border border-[var(--color-primary)]/10">
             <div class="flex gap-2 items-center">
                <ShieldCheck class="text-[var(--color-primary)] h-4 w-4" />
                <span class="text-white text-xs font-black uppercase tracking-widest">Threat Shield</span>
             </div>
             <p class="text-slate-400 text-xs leading-relaxed">Your local environments are secured. 0 blocked access attempts.</p>
          </div>
        </aside>
      </div>
    </main>
    <footer class="px-12 py-6 border-t border-[var(--color-primary)]/10 flex justify-between items-center text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-auto">
      <span>NODE-ID: PX-992-BETA</span>
      <div class="flex gap-8">
        <a class="hover:text-[var(--color-accent-cyan)] transition-colors" href="#">Documentation</a>
        <a class="hover:text-[var(--color-accent-cyan)] transition-colors" href="#">System Settings</a>
        <a class="hover:text-[var(--color-accent-cyan)] text-[var(--color-primary)] transition-colors" @click="toggleDark" href="#">Toggle Theme</a>
      </div>
      <span>v2.4.1 (Stable Build)</span>
    </footer>

    <AddProjectDialog"""

text = text.replace('      </div>\n    </main>\n\n    <AddProjectDialog', new_foot)

with open('d:/local-dashboard/dev-dashboard/frontend/src/pages/Dashboard.vue', 'w', encoding='utf-8') as f:
    f.write(text)

print('Success rewriting high-level layout of Dashboard.vue')
