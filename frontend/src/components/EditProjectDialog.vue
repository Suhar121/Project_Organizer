<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from './ui/Dialog.vue'
import Input from './ui/Input.vue'
import Label from './ui/Label.vue'
import Button from './ui/Button.vue'
import { updateProject } from '../services/api'
import type { Project } from '../services/api'

type EditableCommand = {
  id: string
  label: string
  command: string
  workingDir?: string
}

const props = defineProps<{
  open: boolean
  project: Project | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'updated'): void
}>()

const form = ref({
  name: '',
  description: '',
  path: '',
  tags: ''
})

const editableCommands = ref<EditableCommand[]>([])

watch(() => props.open, (isOpen) => {
  if (isOpen && props.project) {
    const p = props.project
    form.value = {
      name: p.name,
      description: p.description,
      path: p.path,
      tags: p.tags ? p.tags.join(', ') : ''
    }

    editableCommands.value = (p.commands || []).map(c => ({
      id: c.id,
      label: c.label,
      command: c.command,
      workingDir: c.workingDir || ''
    }))
  }
})

const addCommandRow = () => {
  editableCommands.value.push({
    id: `${Date.now()}-${editableCommands.value.length}`,
    label: '',
    command: '',
    workingDir: ''
  })
}

const removeCommandRow = (id: string) => {
  editableCommands.value = editableCommands.value.filter(c => c.id !== id)
}

const submit = async () => {
  if (!form.value.name || !form.value.path || !props.project) return
  try {
    const tagsArray = form.value.tags
      ? form.value.tags.split(',').map(t => t.trim()).filter(Boolean)
      : []

    const commandsArray = editableCommands.value
      .map((entry, idx) => ({
        id: entry.id || `${Date.now()}-${idx}`,
        label: entry.label.trim(),
        command: entry.command.trim(),
        workingDir: (entry.workingDir || '').trim()
      }))
      .filter(entry => entry.label && entry.command)

    await updateProject(props.project.id, {
      name: form.value.name,
      description: form.value.description,
      path: form.value.path,
      tags: tagsArray,
      commands: commandsArray
    })

    emit('updated')
    emit('update:open', false)
  } catch (error) {
    console.error('Failed to update project', error)
    alert('Failed to update project')
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <div class="space-y-6">
      <div class="space-y-2">
        <h2 class="text-lg font-semibold dark:text-gray-100">Edit Project</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Update project details.</p>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <div class="space-y-2">
          <Label for="edit-name">Project Name <span class="text-red-500">*</span></Label>
          <Input id="edit-name" v-model="form.name" placeholder="E.g., Chat App" required />
        </div>

        <div class="space-y-2">
          <Label for="edit-path">Local Path <span class="text-red-500">*</span></Label>
          <Input id="edit-path" v-model="form.path" placeholder="D:\projects\chat-app" required />
        </div>

        <div class="space-y-2">
          <Label for="edit-description">Description</Label>
          <Input id="edit-description" v-model="form.description" placeholder="A brief description of the project" />
        </div>

        <div class="space-y-2">
          <Label for="edit-tags">Tags (comma-separated)</Label>
          <Input id="edit-tags" v-model="form.tags" placeholder="Vue, Node, Socket.io" />
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label>Saved Commands</Label>
            <Button type="button" size="sm" variant="outline" @click="addCommandRow">+ Add Command</Button>
          </div>

          <div class="space-y-2 max-h-64 overflow-y-auto pr-1" v-if="editableCommands.length > 0">
            <div
              v-for="cmd in editableCommands"
              :key="cmd.id"
              class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 space-y-2"
            >
              <div class="flex items-center gap-2">
                <Input v-model="cmd.label" placeholder="Label  (e.g. Dev Server)" class="flex-1 text-sm font-medium" />
                <button
                  type="button"
                  @click="removeCommandRow(cmd.id)"
                  class="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove command"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <Input v-model="cmd.command" placeholder="Command  (e.g. npm run dev)" class="font-mono text-sm" />
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400 flex-shrink-0">Working dir</span>
                <Input v-model="cmd.workingDir" placeholder="Optional subfolder (e.g. frontend)" class="text-xs" />
              </div>
            </div>
          </div>

          <p v-else class="text-sm text-gray-400 italic">No saved commands yet. Click "+ Add Command" to get started.</p>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <Button variant="outline" type="button" @click="$emit('update:open', false)">Cancel</Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  </Dialog>
</template>
