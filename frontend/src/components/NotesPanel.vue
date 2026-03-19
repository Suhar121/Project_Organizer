<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, StickyNote, Plus, Pencil, Trash2, Check } from 'lucide-vue-next'
import { fetchNotes, createNote, updateNote, deleteNote } from '../services/api'
import type { Note, Project } from '../services/api'

const props = defineProps<{
  open: boolean
  project: Project | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const notes = ref<Note[]>([])
const newContent = ref('')
const editingId = ref<string | null>(null)
const editContent = ref('')
const isAdding = ref(false)

const loadNotes = async () => {
  if (!props.project) return
  notes.value = await fetchNotes(props.project.id)
}

const handleAdd = async () => {
  if (!newContent.value.trim() || !props.project) return
  isAdding.value = true
  try {
    const note = await createNote(props.project.id, newContent.value.trim())
    notes.value.unshift(note)
    newContent.value = ''
  } catch (err) {
    console.error(err)
  } finally {
    isAdding.value = false
  }
}

const startEdit = (note: Note) => {
  editingId.value = note.id
  editContent.value = note.content
}

const saveEdit = async (note: Note) => {
  if (!editContent.value.trim() || !props.project) return
  await updateNote(props.project.id, note.id, editContent.value.trim())
  note.content = editContent.value.trim()
  editingId.value = null
}

const cancelEdit = () => {
  editingId.value = null
  editContent.value = ''
}

const handleDelete = async (note: Note) => {
  if (!props.project) return
  await deleteNote(props.project.id, note.id)
  notes.value = notes.value.filter(n => n.id !== note.id)
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

watch(() => props.open, (v) => {
  if (v) loadNotes()
})

watch(() => props.project, () => {
  if (props.open) loadNotes()
})
</script>

<template>
  <!-- Backdrop -->
  <Transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 bg-black/30 z-40"
      @click="$emit('close')"
    />
  </Transition>

  <!-- Slide-over panel -->
  <Transition name="slide">
    <div
      v-if="open"
      class="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 z-50 flex flex-col shadow-2xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <StickyNote class="h-4 w-4 text-gray-500" />
          <h2 class="font-semibold text-sm dark:text-gray-100">Notes</h2>
          <span v-if="project" class="text-gray-500 dark:text-gray-400 text-sm font-normal">
            · {{ project.name }}
          </span>
          <span
            v-if="notes.length > 0"
            class="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium"
          >
            {{ notes.length }}
          </span>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Add note textarea -->
      <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <textarea
          v-model="newContent"
          placeholder="Add a note…  (Ctrl+Enter to save)"
          rows="3"
          class="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-gray-100"
          @keydown.ctrl.enter="handleAdd"
        ></textarea>
        <div class="flex justify-end mt-2">
          <button
            @click="handleAdd"
            :disabled="!newContent.trim() || isAdding"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus class="h-3 w-3" /> Add Note
          </button>
        </div>
      </div>

      <!-- Notes list -->
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <div
          v-for="note in notes"
          :key="note.id"
          class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 group"
        >
          <!-- Editing state -->
          <div v-if="editingId === note.id">
            <textarea
              v-model="editContent"
              rows="3"
              class="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent p-2 text-sm resize-none focus:outline-none dark:text-gray-100"
              @keydown.ctrl.enter="saveEdit(note)"
              @keydown.escape="cancelEdit"
            ></textarea>
            <div class="flex gap-3 mt-2">
              <button
                @click="saveEdit(note)"
                class="text-green-500 hover:text-green-600 text-xs flex items-center gap-1"
              >
                <Check class="h-3 w-3" /> Save
              </button>
              <button
                @click="cancelEdit"
                class="text-gray-400 hover:text-gray-600 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Display state -->
          <div v-else>
            <p class="text-sm whitespace-pre-wrap dark:text-gray-200">{{ note.content }}</p>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-gray-400">{{ formatDate(note.createdAt) }}</span>
              <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click="startEdit(note)"
                  class="text-gray-400 hover:text-blue-500 transition-colors"
                  title="Edit note"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  @click="handleDelete(note)"
                  class="text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete note"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <p
          v-if="notes.length === 0"
          class="text-sm text-gray-400 italic text-center py-10"
        >
          No notes yet for this project.
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>
