<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { X, Square, Loader } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  projectId: string
  commandId: string
  commandLabel: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

interface LogLine {
  type: 'info' | 'stdout' | 'stderr' | 'exit' | 'already-running'
  text: string
}

const lines = ref<LogLine[]>([])
const isRunning = ref(false)
const exitCode = ref<number | null>(null)
const logEl = ref<HTMLElement>()
let es: EventSource | null = null
let activeRunId = ''
let activeProjectId = ''

const scrollToBottom = () => {
  nextTick(() => {
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  })
}

const connect = () => {
  if (es) es.close()
  lines.value = []
  exitCode.value = null
  isRunning.value = true

  const url = `http://localhost:6001/projects/${props.projectId}/commands/stream?commandId=${encodeURIComponent(props.commandId)}`
  es = new EventSource(url)

  es.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as { type: string; text?: string; code?: number; cwd?: string }
      if (msg.type === 'already-running') {
        isRunning.value = false
        lines.value.push({ type: 'already-running', text: msg.text ?? 'Command already running.' })
        es?.close()
        es = null
      } else if (msg.type === 'info' && (msg as any).runId) {
        activeRunId = (msg as any).runId
        activeProjectId = props.projectId
        lines.value.push({ type: 'info', text: msg.text ?? '' })
      } else if (msg.type === 'exit') {
        isRunning.value = false
        exitCode.value = msg.code ?? null
        lines.value.push({ type: 'exit', text: `Process exited with code ${msg.code}` })
        activeRunId = ''
        es?.close()
        es = null
      } else {
        lines.value.push({ type: msg.type as LogLine['type'], text: msg.text ?? '' })
      }
      scrollToBottom()
    } catch { /* ignore parse errors */ }
  }

  es.onerror = () => {
    if (isRunning.value) {
      isRunning.value = false
      lines.value.push({ type: 'exit', text: 'Connection lost or process ended.' })
      scrollToBottom()
    }
    es?.close()
    es = null
  }
}

const killProcess = async () => {
  // First send an explicit kill request so the process tree is terminated
  if (activeRunId && activeProjectId) {
    try {
      await fetch(`http://localhost:6001/projects/${activeProjectId}/commands/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: activeRunId })
      })
    } catch (_) { /* ignore network errors */ }
    activeRunId = ''
  }
  if (es) {
    es.close()
    es = null
  }
  isRunning.value = false
}

const disconnectStream = () => {
  if (es) {
    es.close()
    es = null
  }
}

const close = () => {
  // Close should only hide the panel, not kill the running app process.
  disconnectStream()
  emit('close')
}

watch(() => props.open, (isOpen) => {
  if (isOpen && props.commandId) connect()
  else disconnectStream()
})

onUnmounted(disconnectStream)
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div
        v-if="open"
        class="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-gray-950 border-t border-gray-700 shadow-2xl"
        style="max-height: 40vh; min-height: 220px;"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-800 flex-shrink-0">
          <Loader v-if="isRunning" class="h-3.5 w-3.5 text-green-400 animate-spin" />
          <span
            v-else
            class="h-2 w-2 rounded-full flex-shrink-0"
            :class="exitCode === 0 ? 'bg-green-500' : exitCode !== null ? 'bg-red-500' : 'bg-gray-500'"
          />
          <span class="text-sm font-medium text-gray-200 flex-1 truncate">
            {{ commandLabel }}
            <span v-if="isRunning" class="text-xs text-green-400 ml-2">running…</span>
            <span v-else-if="exitCode !== null" class="text-xs ml-2" :class="exitCode === 0 ? 'text-green-400' : 'text-red-400'">
              exited {{ exitCode === 0 ? 'successfully' : `with code ${exitCode}` }}
            </span>
          </span>
          <button
            v-if="isRunning"
            @click="killProcess"
            title="Kill process"
            class="text-gray-500 hover:text-red-400 transition-colors"
          >
            <Square class="h-4 w-4" />
          </button>
          <button @click="close" title="Close" class="text-gray-500 hover:text-gray-200 transition-colors">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Log output -->
        <div
          ref="logEl"
          class="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed space-y-0.5 select-text"
        >
          <div
            v-for="(line, i) in lines"
            :key="i"
            :class="{
              'text-gray-400': line.type === 'info',
              'text-gray-100': line.type === 'stdout',
              'text-yellow-300': line.type === 'stderr',
              'text-amber-300': line.type === 'already-running',
              'text-green-400': line.type === 'exit' && exitCode === 0,
              'text-red-400': line.type === 'exit' && exitCode !== 0,
            }"
            style="white-space: pre-wrap; word-break: break-all;"
          >{{ line.text }}</div>
          <div v-if="lines.length === 0 && isRunning" class="text-gray-600 italic">Waiting for output…</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
