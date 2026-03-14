<script setup lang="ts">
import { ref } from 'vue'
import Dialog from './ui/Dialog.vue'
import Input from './ui/Input.vue'
import Label from './ui/Label.vue'
import Button from './ui/Button.vue'
import { addProject } from '../services/api'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'added'): void
}>()

const form = ref({
  name: '',
  description: '',
  path: '',
  tags: ''
})

const submit = async () => {
  if (!form.value.name || !form.value.path) return
  try {
    const tagsArray = form.value.tags
      ? form.value.tags.split(',').map(t => t.trim()).filter(Boolean)
      : []

    await addProject({
      name: form.value.name,
      description: form.value.description,
      path: form.value.path,
      tags: tagsArray
    })
    
    emit('added')
    emit('update:open', false)
    form.value = { name: '', description: '', path: '', tags: '' }
  } catch (error) {
    console.error('Failed to add project', error)
    alert('Failed to add project')
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <div class="space-y-6">
      <div class="space-y-2">
        <h2 class="text-lg font-semibold dark:text-gray-100">Add Project</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Register a new local development project.</p>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <div class="space-y-2">
          <Label for="name">Project Name <span class="text-red-500">*</span></Label>
          <Input id="name" v-model="form.name" placeholder="E.g., Chat App" required />
        </div>
        
        <div class="space-y-2">
          <Label for="path">Local Path <span class="text-red-500">*</span></Label>
          <Input id="path" v-model="form.path" placeholder="D:\projects\chat-app" required />
        </div>

        <div class="space-y-2">
          <Label for="description">Description</Label>
          <Input id="description" v-model="form.description" placeholder="A brief description of the project" />
        </div>

        <div class="space-y-2">
          <Label for="tags">Tags (comma-separated)</Label>
          <Input id="tags" v-model="form.tags" placeholder="Vue, Node, Socket.io" />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <Button variant="outline" type="button" @click="$emit('update:open', false)">Cancel</Button>
          <Button type="submit">Save Project</Button>
        </div>
      </form>
    </div>
  </Dialog>
</template>
