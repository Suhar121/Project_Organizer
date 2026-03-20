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
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div class="space-y-4 lg:col-span-1">
      <h1 class="font-headline text-2xl font-bold text-primary uppercase italic tracking-tighter">SCRATCHPAD</h1>
      <textarea
        :value="scratchpad"
        @input="$emit('update:scratchpad', ($event.target as HTMLTextAreaElement).value)"
        class="w-full h-[600px] bg-surface-container-low text-on-surface p-6 font-mono text-sm border-l-2 border-primary outline-none focus:bg-surface-container-high transition-colors resize-none"
        placeholder="READY_FOR_INPUT..."
      ></textarea>
    </div>
    <div class="space-y-4 lg:col-span-1">
      <h1 class="font-headline text-2xl font-bold text-secondary uppercase italic tracking-tighter">OPERATIONAL_TASKS</h1>
      <div class="bg-surface-container-low p-6 h-[600px] overflow-y-auto space-y-4 border-l-2 border-secondary">
        <div class="flex gap-2">
          <input
            v-model="newTodoTitle"
            @keyup.enter="handleAddTodo"
            class="flex-1 bg-surface-container-highest text-on-surface px-4 py-2 outline-none font-label uppercase text-xs"
            placeholder="NEW_TASK_ENTRY..."
          />
          <button @click="handleAddTodo" class="bg-secondary text-on-secondary px-6 font-bold uppercase text-[10px]">COMMIT</button>
        </div>
        <div v-for="todo in todos" :key="todo.id" class="flex items-center justify-between p-3 bg-surface-container-highest group">
          <div class="flex items-center gap-3">
            <button
              @click="$emit('move-todo', todo, todo.status === 'done' ? 'todo' : 'done')"
              class="material-symbols-outlined text-sm"
              :class="todo.status === 'done' ? 'text-secondary' : 'text-outline-variant'"
            >
              {{ todo.status === 'done' ? 'check_box' : 'check_box_outline_blank' }}
            </button>
            <span :class="todo.status === 'done' ? 'line-through text-outline-variant' : ''" class="text-xs uppercase font-label">{{ todo.title }}</span>
          </div>
          <button @click="$emit('remove-todo', todo.id)" class="material-symbols-outlined text-xs text-outline-variant opacity-0 group-hover:opacity-100 hover:text-error">delete</button>
        </div>
      </div>
    </div>
    <div class="lg:col-span-1">
      <ProjectIdeaWriter />
    </div>
  </div>
</template>
