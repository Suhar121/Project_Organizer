<script setup lang="ts">
import { ref } from 'vue'
import ProjectIdeaWriter from '../components/ProjectIdeaWriter.vue'

type TodoStatus = 'todo' | 'doing' | 'done'
type TodoItem = {
  id: string
  title: string
  status: TodoStatus
}

const props = defineProps<{
  scratchpad: string
  todos: TodoItem[]
}>()

const emit = defineEmits<{
  (e: 'update:scratchpad', value: string): void
  (e: 'add-todo', title: string): void
  (e: 'move-todo', todo: TodoItem, status: TodoStatus): void
  (e: 'remove-todo', id: string): void
}>()

const newTodoTitle = ref('')

const handleAddTodo = () => {
  if (!newTodoTitle.value.trim()) return
  emit('add-todo', newTodoTitle.value.trim())
  newTodoTitle.value = ''
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
    <div class="space-y-4 lg:col-span-1 flex flex-col h-full">
      <h1 class="text-2xl font-semibold text-on-surface tracking-tight">Scratchpad</h1>
      <div class="flex-1 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
        <textarea
          :value="scratchpad"
          @input="$emit('update:scratchpad', ($event.target as HTMLTextAreaElement).value)"
          class="flex-1 w-full bg-transparent text-on-surface p-6 font-mono text-sm outline-none focus:bg-surface-container-high/30 transition-colors resize-none leading-relaxed"
          placeholder="Type your notes here..."
        ></textarea>
      </div>
    </div>

    <div class="space-y-4 lg:col-span-1 flex flex-col h-full">
      <h1 class="text-2xl font-semibold text-on-surface tracking-tight">Quick Tasks</h1>
      <div class="flex-1 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm flex flex-col overflow-hidden">
        <div class="p-4 border-b border-outline-variant/20 bg-surface-container-highest/30">
          <div class="flex gap-2">
            <input
              v-model="newTodoTitle"
              @keyup.enter="handleAddTodo"
              class="flex-1 bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg outline-none text-sm border border-outline-variant/20 focus:border-primary/50 transition-colors"
              placeholder="What's next?"
            />
            <button @click="handleAddTodo" class="bg-primary text-on-primary px-4 rounded-lg font-medium text-xs active:scale-95 transition-all shadow-sm hover:bg-primary/90">Add</button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-2">
          <div v-for="todo in todos" :key="todo.id" class="flex items-center justify-between p-3 bg-surface-container-highest/50 rounded-lg group hover:bg-surface-container-highest transition-colors border border-outline-variant/10">
            <div class="flex items-center gap-3">
              <button
                @click="$emit('move-todo', todo, todo.status === 'done' ? 'todo' : 'done')"
                class="material-symbols-outlined text-xl transition-colors"
                :class="todo.status === 'done' ? 'text-primary' : 'text-on-surface-variant/40 hover:text-primary/60'"
              >
                {{ todo.status === 'done' ? 'check_circle' : 'radio_button_unchecked' }}
              </button>
              <span :class="todo.status === 'done' ? 'line-through text-on-surface-variant/60' : 'text-on-surface'" class="text-sm font-medium">{{ todo.title }}</span>
            </div>
            <button @click="$emit('remove-todo', todo.id)" class="material-symbols-outlined text-lg text-on-surface-variant/40 opacity-0 group-hover:opacity-100 hover:text-error transition-all">delete</button>
          </div>
          <div v-if="todos.length === 0" class="h-32 flex flex-col items-center justify-center text-on-surface-variant/40">
            <span class="material-symbols-outlined text-3xl mb-2">playlist_add_check</span>
            <span class="text-xs font-medium uppercase tracking-wider">No active tasks</span>
          </div>
        </div>
      </div>
    </div>

    <div class="lg:col-span-1 h-full">
      <ProjectIdeaWriter />
    </div>
  </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(var(--primary), 0.1);
  border-radius: 10px;
}
</style>
