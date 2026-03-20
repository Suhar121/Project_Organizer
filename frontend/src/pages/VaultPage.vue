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
  <div class="max-w-4xl mx-auto space-y-8 h-full flex flex-col">
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-bold text-on-surface tracking-tight">Secret Vault</h1>
      <p class="text-on-surface-variant text-sm">Securely store environment variables and access keys.</p>
    </div>

    <div v-if="!vaultIsUnlocked" class="flex-1 flex items-center justify-center pb-20">
      <div class="bg-surface-container-low p-10 rounded-3xl border border-outline-variant/30 shadow-xl w-full max-w-md space-y-6">
        <div class="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span class="material-symbols-outlined text-3xl text-secondary">lock</span>
        </div>
        <div class="space-y-2 text-center">
          <h2 class="text-xl font-semibold text-on-surface">Vault Locked</h2>
          <p class="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Authorization Required</p>
        </div>
        <div class="space-y-4">
          <input
            :value="vaultUnlockPassword"
            @input="$emit('update:vaultUnlockPassword', ($event.target as HTMLInputElement).value)"
            @keyup.enter="$emit('unlock')"
            type="password"
            placeholder="Master Password"
            class="w-full bg-surface-container-highest px-6 py-4 rounded-xl outline-none text-center border border-outline-variant/20 focus:border-secondary/50 transition-all font-mono"
          />
          <Button class="w-full h-14 rounded-xl text-base font-semibold" @click="$emit('unlock')">Unlock Vault</Button>
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
      <div class="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/30 shadow-sm space-y-6 h-fit">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary">add_moderator</span>
          <h3 class="text-sm font-bold uppercase tracking-widest text-on-surface-variant">New Entry</h3>
        </div>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-xs font-medium text-on-surface-variant ml-1">Key Label</label>
            <input v-model="vaultLabel" placeholder="e.g. STRIPE_API_KEY" class="w-full bg-surface-container-highest px-4 py-3 rounded-lg outline-none text-sm border border-outline-variant/20 focus:border-primary/50 transition-all font-mono" />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium text-on-surface-variant ml-1">Secret Value</label>
            <input v-model="vaultValue" placeholder="Paste value here..." class="w-full bg-surface-container-highest px-4 py-3 rounded-lg outline-none text-sm border border-outline-variant/20 focus:border-primary/50 transition-all font-mono" />
          </div>
          <Button class="w-full h-12 rounded-lg" @click="handleAddSecret">Save Secret</Button>
        </div>
      </div>

      <div class="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col h-full min-h-[500px]">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-secondary">encrypted</span>
            <h3 class="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Registry</h3>
          </div>
          <span class="text-[10px] font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">{{ vaultSecrets.length }} Items</span>
        </div>

        <div class="flex-1 overflow-y-auto space-y-3">
          <div v-for="s in vaultSecrets" :key="s.id" class="p-4 bg-surface-container-highest/50 rounded-xl flex justify-between items-center group hover:bg-surface-container-highest transition-colors border border-outline-variant/10">
            <div class="min-w-0 flex-1 mr-4">
              <p class="text-xs font-bold text-on-surface truncate mb-1 uppercase tracking-tight">{{ s.label }}</p>
              <p class="text-[11px] font-mono text-on-surface-variant/60 truncate bg-surface/30 px-2 py-1 rounded">
                {{ visibleSecretIds[s.id] ? s.value : '••••••••••••••••' }}
              </p>
            </div>
            <div class="flex gap-1">
              <button @click="$emit('toggle-visibility', s.id)" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface transition-colors">
                <span class="material-symbols-outlined text-lg text-on-surface-variant/60">
                  {{ visibleSecretIds[s.id] ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
              <button @click="$emit('remove-secret', s.id)" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-error/10 hover:text-error transition-colors">
                <span class="material-symbols-outlined text-lg text-on-surface-variant/40 hover:text-inherit">delete</span>
              </button>
            </div>
          </div>

          <div v-if="vaultSecrets.length === 0" class="h-64 flex flex-col items-center justify-center text-on-surface-variant/40">
            <span class="material-symbols-outlined text-4xl mb-3 opacity-20">key_off</span>
            <p class="text-sm font-medium">No secrets stored</p>
          </div>
        </div>

        <div class="pt-6 mt-6 border-t border-outline-variant/20 text-center">
          <button @click="$emit('lock')" class="text-xs font-bold text-secondary hover:text-secondary/80 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
            <span class="material-symbols-outlined text-sm">logout</span>
            Lock Vault
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(var(--secondary), 0.1);
  border-radius: 10px;
}
</style>
