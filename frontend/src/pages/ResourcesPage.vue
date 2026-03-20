<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ExternalLink, Trash2, Plus, Folder } from 'lucide-vue-next'

type Resource = {
  id: string
  name: string
  url: string
  category: string
}

const RESOURCES_STORAGE_KEY = 'dev-dashboard.resources'
const categories = ['DOCS', 'TOOLS', 'INFRA', 'MISC']

const resources = ref<Resource[]>([])
const isAdding = ref(false)
const newResource = ref({
  name: '',
  url: '',
  category: 'DOCS'
})

const loadResources = () => {
  const saved = localStorage.getItem(RESOURCES_STORAGE_KEY)
  if (saved) {
    try {
      resources.value = JSON.parse(saved)
    } catch {
      resources.value = []
    }
  }
}

const saveResources = () => {
  localStorage.setItem(RESOURCES_STORAGE_KEY, JSON.stringify(resources.value))
}

const addResource = () => {
  if (!newResource.value.name.trim() || !newResource.value.url.trim()) return

  let url = newResource.value.url.trim()
  if (!url.startsWith('http')) {
    url = 'http://' + url
  }

  resources.value.push({
    id: Date.now().toString(),
    name: newResource.value.name.trim(),
    url,
    category: newResource.value.category
  })

  newResource.value = { name: '', url: '', category: 'DOCS' }
  isAdding.value = false
  saveResources()
}

const removeResource = (id: string) => {
  resources.value = resources.value.filter(r => r.id !== id)
  saveResources()
}

const resourcesByCategory = computed(() => {
  const map: Record<string, Resource[]> = {}
  categories.forEach(cat => { map[cat] = [] })
  resources.value.forEach(r => {
    if (!map[r.category]) map[r.category] = []
    map[r.category]!.push(r)
  })
  return map
})

onMounted(loadResources)
</script>

<template>
  <div class="space-y-8">
    <div class="flex justify-between items-center">
      <h1 class="font-headline text-3xl font-bold text-primary uppercase italic tracking-tighter">RESOURCE_HUB</h1>
      <button
        @click="isAdding = !isAdding"
        class="bg-primary text-on-primary px-4 py-2 font-headline uppercase tracking-widest text-xs font-bold active:scale-95 transition-all"
      >
        {{ isAdding ? 'CANCEL_ENTRY' : 'ADD_RESOURCE' }}
      </button>
    </div>

    <!-- Entry Form -->
    <div v-if="isAdding" class="bg-surface-container-low p-6 border-l-2 border-primary space-y-4 animate-in fade-in slide-in-from-top-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <label class="text-[10px] font-label font-bold text-outline-variant uppercase">RESOURCE_NAME</label>
          <input
            v-model="newResource.name"
            class="w-full bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label uppercase text-xs"
            placeholder="E.G. VUE_DOCS"
          />
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-label font-bold text-outline-variant uppercase">URL_ENDPOINT</label>
          <input
            v-model="newResource.url"
            class="w-full bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label text-xs"
            placeholder="https://..."
          />
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-label font-bold text-outline-variant uppercase">CATEGORY</label>
          <select
            v-model="newResource.category"
            class="w-full bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label uppercase text-xs appearance-none"
          >
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
      </div>
      <button
        @click="addResource"
        class="w-full bg-primary text-on-primary py-3 font-bold uppercase text-[10px] active:scale-95 transition-transform"
      >
        COMMIT_RESOURCE
      </button>
    </div>

    <!-- Category Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="cat in categories" :key="cat" class="space-y-4">
        <div class="flex items-center gap-2 border-b border-primary/20 pb-2">
          <Folder class="h-3 w-3 text-primary" />
          <h2 class="text-[10px] font-label font-bold text-on-surface-variant tracking-widest uppercase">{{ cat }}</h2>
          <span class="ml-auto text-[8px] font-mono text-outline-variant opacity-50">{{ resourcesByCategory[cat]?.length || 0 }}</span>
        </div>

        <div class="space-y-2">
          <div
            v-for="res in (resourcesByCategory[cat] || [])"
            :key="res.id"
            class="flex items-center justify-between p-3 bg-surface-container-low border-l border-primary/10 hover:border-primary transition-colors group"
          >
            <a
              :href="res.url"
              target="_blank"
              class="flex items-center gap-3 text-xs font-label uppercase truncate text-on-surface hover:text-primary transition-colors"
            >
              <ExternalLink class="h-3 w-3 opacity-50" />
              {{ res.name }}
            </a>
            <button
              @click="removeResource(res.id)"
              class="material-symbols-outlined text-xs text-outline-variant opacity-0 group-hover:opacity-100 hover:text-error transition-opacity"
            >
              delete
            </button>
          </div>
          <div v-if="!resourcesByCategory[cat] || resourcesByCategory[cat]!.length === 0" class="p-8 border border-dashed border-outline-variant/10 flex items-center justify-center">
             <span class="text-[8px] font-mono uppercase text-outline-variant opacity-30 italic">VACANT</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
