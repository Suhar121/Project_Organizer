<script setup lang="ts">
import { ref, onMounted } from 'vue'

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
  <div class="space-y-4">
    <h1 class="font-headline text-2xl font-bold text-primary uppercase italic tracking-tighter">PROJECT_IDEAS</h1>
    <div class="bg-surface-container-low p-6 space-y-4 border-l-2 border-primary">
      <div class="space-y-3">
        <input
          v-model="newIdeaTitle"
          class="w-full bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label uppercase text-xs"
          placeholder="IDEA_TITLE..."
        />
        <textarea
          v-model="newIdeaDescription"
          class="w-full h-24 bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label text-xs resize-none"
          placeholder="DESCRIPTION_AND_CORE_CONCEPTS..."
        ></textarea>
        <button
          @click="addIdea"
          class="w-full bg-primary text-on-primary py-2 font-bold uppercase text-[10px] active:scale-95 transition-transform"
        >
          COMMIT_IDEA
        </button>
      </div>

      <div class="space-y-3 mt-6">
        <div v-for="idea in ideas" :key="idea.id" class="p-4 bg-surface-container-highest group relative">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-xs font-bold uppercase text-primary">{{ idea.title }}</h3>
            <button @click="removeIdea(idea.id)" class="material-symbols-outlined text-xs text-outline-variant hover:text-error">delete</button>
          </div>
          <p class="text-[10px] text-on-surface-variant leading-relaxed">{{ idea.description }}</p>
          <div class="mt-2 text-[8px] text-outline-variant uppercase font-mono">
            {{ new Date(idea.createdAt).toLocaleDateString() }}
          </div>
        </div>
        <div v-if="ideas.length === 0" class="text-center py-8 border border-dashed border-outline-variant/30">
          <p class="text-[10px] font-label uppercase text-outline-variant">NO_IDEAS_RECORDED</p>
        </div>
      </div>
    </div>
  </div>
</template>
