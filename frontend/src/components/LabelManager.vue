<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from './ui/Dialog.vue'
import Input from './ui/Input.vue'
import Button from './ui/Button.vue'
import { fetchLabels, createLabel, deleteLabel } from '../services/api'
import type { Label } from '../services/api'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'changed'): void
}>()

const labels = ref<Label[]>([])
const newName = ref('')
const newColor = ref('#3b82f6')
const isCreating = ref(false)

const presetColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
]

const loadLabels = async () => {
  labels.value = await fetchLabels()
}

const handleCreate = async () => {
  if (!newName.value.trim()) return
  isCreating.value = true
  try {
    await createLabel({ name: newName.value.trim(), color: newColor.value })
    newName.value = ''
    newColor.value = '#3b82f6'
    await loadLabels()
    emit('changed')
  } catch (err: any) {
    alert(err?.response?.data?.error || 'Failed to create label')
  } finally {
    isCreating.value = false
  }
}

const handleDelete = async (id: string) => {
  await deleteLabel(id)
  await loadLabels()
  emit('changed')
}

watch(() => props.open, (v) => {
  if (v) loadLabels()
})
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <div class="mb-5 pr-6">
      <h2 class="text-base font-semibold">Labels</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Create simple color tags for projects.</p>
    </div>

    <div class="space-y-3 mb-4">
      <div class="flex gap-2">
        <Input
          v-model="newName"
          placeholder="Label name"
          class="flex-1"
          @keyup.enter="handleCreate"
        />
        <input
          type="color"
          v-model="newColor"
          class="h-9 w-10 rounded-md border border-gray-200 dark:border-gray-700 cursor-pointer p-1"
        />
        <Button @click="handleCreate" :disabled="isCreating || !newName.trim()" class="h-9">Add</Button>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="c in presetColors"
          :key="c"
          class="h-4 w-4 rounded-full border transition-transform hover:scale-110"
          :class="newColor === c ? 'border-gray-700 dark:border-gray-200 scale-110' : 'border-transparent'"
          :style="{ backgroundColor: c }"
          @click="newColor = c"
        />
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div class="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
        <div
          v-for="label in labels"
          :key="label.id"
          class="flex items-center justify-between px-3 py-2"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="h-2.5 w-2.5 rounded-full shrink-0" :style="{ backgroundColor: label.color }"></span>
            <span class="text-sm font-medium truncate">{{ label.name }}</span>
          </div>
          <button
            @click="handleDelete(label.id)"
            class="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >Delete</button>
        </div>
        <p v-if="labels.length === 0" class="text-sm text-gray-400 py-4 text-center">No labels yet.</p>
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
      <Button variant="outline" @click="$emit('update:open', false)">Close</Button>
    </div>
  </Dialog>
</template>
