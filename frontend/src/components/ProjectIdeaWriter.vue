<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Lightbulb, Trash2, Plus } from 'lucide-vue-next'

type ProjectIdea = {
  id: string
  title: string
  description: string
  createdAt: string
}

const IDEAS_STORAGE_KEY = 'dev-dashboard.project-ideas'

const ideas = ref<ProjectIdea[]>([])
const newIdeaTitle = ref('')
const newIdeaDescription = ref('')

const loadIdeas = () => {
  const saved = localStorage.getItem(IDEAS_STORAGE_KEY)
  if (saved) {
    try {
      ideas.value = JSON.parse(saved)
    } catch {
      ideas.value = []
    }
  }
}

const saveIdeas = () => {
  localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(ideas.value))
}

const addIdea = () => {
  if (!newIdeaTitle.value.trim()) return
  ideas.value.unshift({
    id: Date.now().toString(),
    title: newIdeaTitle.value.trim(),
    description: newIdeaDescription.value.trim(),
    createdAt: new Date().toISOString()
  })
  newIdeaTitle.value = ''
  newIdeaDescription.value = ''
  saveIdeas()
}

const removeIdea = (id: string) => {
  ideas.value = ideas.value.filter(idea => idea.id !== id)
  saveIdeas()
}

onMounted(loadIdeas)
</script>

<template>
  <div class="space-y-4 flex flex-col h-full">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-semibold text-on-surface tracking-tight">Project Ideas</h1>
      <span class="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">{{ ideas.length }}</span>
    </div>

    <div class="flex-1 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm flex flex-col overflow-hidden">
      <div class="p-6 space-y-4 border-b border-outline-variant/20 bg-surface-container-highest/30">
        <div class="space-y-3">
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Concept Title</label>
            <input
              v-model="newIdeaTitle"
              class="w-full bg-surface-container-highest text-on-surface px-4 py-2.5 rounded-lg outline-none text-sm border border-outline-variant/20 focus:border-primary/50 transition-all"
              placeholder="What's the vision?"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Description</label>
            <textarea
              v-model="newIdeaDescription"
              class="w-full h-28 bg-surface-container-highest text-on-surface px-4 py-3 rounded-lg outline-none text-sm resize-none border border-outline-variant/20 focus:border-primary/50 transition-all leading-relaxed"
              placeholder="Flesh out the core concepts and requirements..."
            ></textarea>
          </div>
          <button
            @click="addIdea"
            class="w-full bg-primary text-on-primary py-3 rounded-lg font-bold text-xs uppercase tracking-widest active:scale-[0.98] transition-all shadow-sm hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            <Plus class="h-3.5 w-3.5" />
            Capture Idea
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div v-for="idea in ideas" :key="idea.id" class="p-4 bg-surface-container-highest/50 rounded-xl border border-outline-variant/10 group hover:bg-surface-container-highest transition-all">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <Lightbulb class="h-3.5 w-3.5 text-primary" />
              <h3 class="text-sm font-semibold text-on-surface tracking-tight">{{ idea.title }}</h3>
            </div>
            <button @click="removeIdea(idea.id)" class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-error/10 hover:text-error transition-all opacity-0 group-hover:opacity-100">
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
          <p class="text-xs text-on-surface-variant/70 leading-relaxed">{{ idea.description }}</p>
          <div class="mt-4 flex items-center justify-between">
            <span class="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-tighter font-mono">
              Captured {{ new Date(idea.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
            </span>
          </div>
        </div>

        <div v-if="ideas.length === 0" class="h-48 flex flex-col items-center justify-center text-on-surface-variant/30 border-2 border-dashed border-outline-variant/10 rounded-2xl mx-2">
          <Lightbulb class="h-8 w-8 mb-3 opacity-20" />
          <p class="text-[10px] font-bold uppercase tracking-widest">No ideas captured yet</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(var(--primary), 0.1);
  border-radius: 10px;
}
</style>
