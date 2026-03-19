<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Dialog from './ui/Dialog.vue'
import Input from './ui/Input.vue'
import Label from './ui/Label.vue'
import Button from './ui/Button.vue'
import { fetchSettings, updateSettings, type LLMSettings } from '../services/api'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const providerDefaults = {
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  gemini: { baseURL: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash' },
  kimi: { baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  ollama: { baseURL: 'http://localhost:11434', model: 'llama3.1' },
  generic: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
} as const

const getProviderDefaults = (provider: string) => {
  return providerDefaults[provider as keyof typeof providerDefaults] || providerDefaults.openai
}

const settings = ref<LLMSettings>({
  provider: 'openai',
  apiKey: '',
  model: getProviderDefaults('openai').model,
  baseURL: getProviderDefaults('openai').baseURL
})

const loading = ref(false)

const loadSettings = async () => {
  try {
    const data = await fetchSettings()
    settings.value = {
      provider: data?.provider || 'openai',
      apiKey: data?.apiKey || '',
      model: data?.model || getProviderDefaults(data?.provider || 'openai').model,
      baseURL: data?.baseURL || getProviderDefaults(data?.provider || 'openai').baseURL
    }
  } catch (error) {
    console.error('Failed to load settings', error)
  }
}

const save = async () => {
  loading.value = true
  try {
    await updateSettings(settings.value)
    emit('update:open', false)
  } catch (error: unknown) {
    console.error('Failed to save settings', error)
    const maybeAxios = error as { response?: { data?: { error?: string } }; message?: string }
    const message = maybeAxios?.response?.data?.error || maybeAxios?.message || 'Failed to save settings'
    alert(message)
  } finally {
    loading.value = false
  }
}

onMounted(loadSettings)

watch(
  () => props.open,
  (opened) => {
    if (opened) loadSettings()
  }
)

watch(
  () => settings.value.provider,
  (nextProvider, previousProvider) => {
    const nextDefaults = getProviderDefaults(nextProvider)
    const previousDefaults = getProviderDefaults(previousProvider || 'openai')

    const isModelCustom = settings.value.model && settings.value.model !== previousDefaults.model
    const isBaseURLCustom = settings.value.baseURL && settings.value.baseURL !== previousDefaults.baseURL

    if (!isModelCustom) {
      settings.value.model = nextDefaults.model
    }

    if (!isBaseURLCustom || /api\.gemini\.com/i.test(settings.value.baseURL)) {
      settings.value.baseURL = nextDefaults.baseURL
    }
  }
)
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <div class="space-y-5">
      <div class="space-y-1">
        <h2 class="text-base font-semibold">AI Settings</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Configure model provider used for project auto-analysis.</p>
      </div>

      <form @submit.prevent="save" class="space-y-4">
        <div class="space-y-1.5">
          <Label for="provider">Provider</Label>
          <select
            id="provider"
            v-model="settings.provider"
            class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
            <option value="kimi">Kimi</option>
            <option value="ollama">Ollama (Local)</option>
            <option value="generic">Generic OpenAI-Compatible</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <Label for="base-url">Base URL</Label>
          <Input id="base-url" v-model="settings.baseURL" placeholder="https://api.openai.com/v1" />
        </div>

        <div class="space-y-1.5">
          <Label for="api-key">API Key</Label>
          <Input id="api-key" v-model="settings.apiKey" type="password" placeholder="sk-..." />
        </div>

        <div class="space-y-1.5">
          <Label for="model">Model</Label>
          <Input id="model" v-model="settings.model" placeholder="gpt-4o-mini" />
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button variant="outline" type="button" @click="$emit('update:open', false)">Cancel</Button>
          <Button type="submit" :disabled="loading">Save Settings</Button>
        </div>
      </form>
    </div>
  </Dialog>
</template>
