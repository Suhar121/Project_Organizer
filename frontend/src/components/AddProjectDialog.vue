<script setup lang="ts">
import { computed, ref } from 'vue'
import Dialog from './ui/Dialog.vue'
import Input from './ui/Input.vue'
import Label from './ui/Label.vue'
import Button from './ui/Button.vue'
import Badge from './ui/Badge.vue'
import { addProject, scanMainFolder, bulkAddProjects } from '../services/api'
import type { ScannedFolder } from '../services/api'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'added'): void
}>()

type AddMode = 'single' | 'main-folder'
const mode = ref<AddMode>('single')

const form = ref({
  name: '',
  description: '',
  path: '',
  tags: ''
})

const folderForm = ref({
  mainFolderPath: '',
  descriptionPrefix: '',
  tags: ''
})

const scannedFolders = ref<ScannedFolder[]>([])
const selectedPaths = ref<string[]>([])
const isScanning = ref(false)

const allSelected = computed(() => {
  return scannedFolders.value.length > 0 && selectedPaths.value.length === scannedFolders.value.length
})

const resetSingleForm = () => {
  form.value = { name: '', description: '', path: '', tags: '' }
}

const resetFolderForm = () => {
  folderForm.value = { mainFolderPath: '', descriptionPrefix: '', tags: '' }
  scannedFolders.value = []
  selectedPaths.value = []
}

const closeDialog = () => {
  emit('update:open', false)
}

const getTagsArray = (raw: string) => {
  return raw
    ? raw.split(',').map(tag => tag.trim()).filter(Boolean)
    : []
}

const submitSingle = async () => {
  if (!form.value.name || !form.value.path) return
  try {
    await addProject({
      name: form.value.name,
      description: form.value.description,
      path: form.value.path,
      tags: getTagsArray(form.value.tags)
    })

    emit('added')
    closeDialog()
    resetSingleForm()
  } catch (error) {
    console.error('Failed to add project', error)
    alert('Failed to add project')
  }
}

const scanFolders = async () => {
  if (!folderForm.value.mainFolderPath) return
  isScanning.value = true
  try {
    const { folders } = await scanMainFolder(folderForm.value.mainFolderPath)
    scannedFolders.value = folders
    selectedPaths.value = folders.map(folder => folder.path)
  } catch (error) {
    console.error('Failed to scan folders', error)
    alert('Failed to scan folders')
  } finally {
    isScanning.value = false
  }
}

const togglePath = (folderPath: string) => {
  if (selectedPaths.value.includes(folderPath)) {
    selectedPaths.value = selectedPaths.value.filter(path => path !== folderPath)
  } else {
    selectedPaths.value.push(folderPath)
  }
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedPaths.value = []
  } else {
    selectedPaths.value = scannedFolders.value.map(folder => folder.path)
  }
}

const submitFolderBulk = async () => {
  if (!folderForm.value.mainFolderPath || selectedPaths.value.length === 0) return

  try {
    await bulkAddProjects({
      mainFolderPath: folderForm.value.mainFolderPath,
      selectedPaths: selectedPaths.value,
      descriptionPrefix: folderForm.value.descriptionPrefix,
      tags: getTagsArray(folderForm.value.tags)
    })

    emit('added')
    closeDialog()
    resetFolderForm()
  } catch (error) {
    console.error('Failed to bulk add projects', error)
    alert('Failed to add selected folders')
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <div class="space-y-6">
      <div class="space-y-2">
        <h2 class="text-lg font-semibold dark:text-gray-100">Add Project</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Add one project or scan a main folder and pick subfolders.</p>
      </div>

      <div class="flex gap-2">
        <Button :variant="mode === 'single' ? 'default' : 'outline'" type="button" @click="mode = 'single'">Single Project</Button>
        <Button :variant="mode === 'main-folder' ? 'default' : 'outline'" type="button" @click="mode = 'main-folder'">Main Folder</Button>
      </div>

      <form v-if="mode === 'single'" @submit.prevent="submitSingle" class="space-y-4">
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
          <Button variant="outline" type="button" @click="closeDialog">Cancel</Button>
          <Button type="submit">Save Project</Button>
        </div>
      </form>

      <div v-else class="space-y-4">
        <div class="space-y-2">
          <Label for="main-folder">Main Folder Path <span class="text-red-500">*</span></Label>
          <div class="flex gap-2">
            <Input id="main-folder" v-model="folderForm.mainFolderPath" placeholder="D:\projects" />
            <Button type="button" variant="outline" @click="scanFolders" :disabled="isScanning">
              {{ isScanning ? 'Scanning...' : 'Scan' }}
            </Button>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="folder-description">Description Prefix</Label>
          <Input id="folder-description" v-model="folderForm.descriptionPrefix" placeholder="Workspace projects" />
        </div>

        <div class="space-y-2">
          <Label for="folder-tags">Tags for selected projects (comma-separated)</Label>
          <Input id="folder-tags" v-model="folderForm.tags" placeholder="Monorepo, Work" />
        </div>

        <div v-if="scannedFolders.length > 0" class="space-y-3 rounded-md border border-gray-200 dark:border-gray-800 p-3 max-h-64 overflow-auto">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium">Subfolders Found: {{ scannedFolders.length }}</p>
            <Button type="button" size="sm" variant="outline" @click="toggleSelectAll">
              {{ allSelected ? 'Unselect All' : 'Select All' }}
            </Button>
          </div>

          <div class="space-y-2">
            <label
              v-for="folder in scannedFolders"
              :key="folder.path"
              class="flex items-center justify-between gap-3 rounded border border-gray-200 dark:border-gray-800 p-2 cursor-pointer"
            >
              <div class="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  :checked="selectedPaths.includes(folder.path)"
                  @change="togglePath(folder.path)"
                />
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate">{{ folder.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ folder.path }}</p>
                </div>
              </div>
              <div class="flex gap-1 shrink-0">
                <Badge v-if="folder.hasGit" variant="secondary">git</Badge>
                <Badge v-if="folder.hasPackageJson" variant="secondary">package</Badge>
              </div>
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" @click="closeDialog">Cancel</Button>
          <Button type="button" @click="submitFolderBulk" :disabled="selectedPaths.length === 0">
            Add Selected ({{ selectedPaths.length }})
          </Button>
        </div>
      </div>
    </div>
  </Dialog>
</template>
