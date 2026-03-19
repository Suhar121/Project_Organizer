<script setup lang="ts">
import { ref } from 'vue'
import Button from '../components/ui/Button.vue'

type VaultSecret = {
  id: string
  label: string
  value: string
  note?: string
}

const props = defineProps<{
  vaultIsUnlocked: boolean
  vaultSecrets: VaultSecret[]
  visibleSecretIds: Record<string, boolean>
  vaultUnlockPassword: string
}>()

const emit = defineEmits<{
  (e: 'update:vaultUnlockPassword', value: string): void
  (e: 'unlock'): void
  (e: 'lock'): void
  (e: 'add-secret', label: string, value: string): void
  (e: 'remove-secret', id: string): void
  (e: 'toggle-visibility', id: string): void
}>()

const vaultLabel = ref('')
const vaultValue = ref('')

const handleAddSecret = () => {
  if (!vaultLabel.value.trim() || !vaultValue.value.trim()) return
  emit('add-secret', vaultLabel.value.trim(), vaultValue.value.trim())
  vaultLabel.value = ''
  vaultValue.value = ''
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <h1 class="font-headline text-3xl font-bold text-secondary uppercase italic tracking-tighter text-center">ENCRYPTED_VAULT</h1>
    <div v-if="!vaultIsUnlocked" class="bg-surface-container-low p-8 border-t-2 border-secondary">
      <p class="font-label text-xs uppercase text-on-surface-variant mb-4 text-center">AUTHORIZATION_REQUIRED</p>
      <input
        :value="vaultUnlockPassword"
        @input="$emit('update:vaultUnlockPassword', ($event.target as HTMLInputElement).value)"
        @keyup.enter="$emit('unlock')"
        type="password"
        placeholder="MASTER_KEY..."
        class="w-full bg-surface-container-highest p-4 outline-none mb-4 text-center"
      />
      <Button class="w-full h-12" @click="$emit('unlock')">AUTHORIZE_ACCESS</Button>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-surface-container-low p-6 space-y-4">
        <h3 class="font-label text-xs font-bold uppercase text-primary">NEW_SECRET</h3>
        <input v-model="vaultLabel" placeholder="LABEL..." class="w-full bg-surface-container-highest p-3 outline-none text-xs" />
        <input v-model="vaultValue" placeholder="VALUE..." class="w-full bg-surface-container-highest p-3 outline-none text-xs" />
        <Button class="w-full" @click="handleAddSecret">COMMIT_SECRET</Button>
      </div>
      <div class="bg-surface-container-low p-6 space-y-4">
        <h3 class="font-label text-xs font-bold uppercase text-secondary">REGISTRY</h3>
        <div v-for="s in vaultSecrets" :key="s.id" class="p-3 bg-surface-container-highest flex justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase">{{ s.label }}</p>
            <p class="text-[9px] font-mono text-outline-variant">{{ visibleSecretIds[s.id] ? s.value : '********' }}</p>
          </div>
          <div class="flex gap-2">
            <button @click="$emit('toggle-visibility', s.id)" class="material-symbols-outlined text-xs">
              {{ visibleSecretIds[s.id] ? 'visibility_off' : 'visibility' }}
            </button>
            <button @click="$emit('remove-secret', s.id)" class="material-symbols-outlined text-xs hover:text-error">delete</button>
          </div>
        </div>
      </div>
    </div>
    <div class="text-center" v-if="vaultIsUnlocked">
      <Button variant="outline" size="sm" @click="$emit('lock')">LOCK_VAULT</Button>
    </div>
  </div>
</template>
