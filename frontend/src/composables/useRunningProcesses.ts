import { ref, computed, onMounted, onUnmounted } from 'vue'
import { fetchRunningProcesses, type RunningProcess } from '../services/api'

export function useRunningProcesses(pollIntervalMs = 5000) {
  const runningProcesses = ref<RunningProcess[]>([])
  const isLoading = ref(false)
  let pollHandle: number | null = null

  const load = async () => {
    if (document.hidden) return
    isLoading.value = true
    try {
      const { processes } = await fetchRunningProcesses()
      runningProcesses.value = processes
    } catch (err) {
      console.error('Failed to fetch running processes:', err)
    } finally {
      isLoading.value = false
    }
  }

  const runningProjectIds = computed(() =>
    new Set(runningProcesses.value.map(p => p.projectId))
  )

  const isProjectRunning = (projectId: string) =>
    runningProjectIds.value.has(projectId)

  const getRunningCount = () => runningProcesses.value.length

  onMounted(() => {
    load()
    pollHandle = window.setInterval(load, pollIntervalMs)
    document.addEventListener('visibilitychange', load)
  })

  onUnmounted(() => {
    if (pollHandle) clearInterval(pollHandle)
    document.removeEventListener('visibilitychange', load)
  })

  return {
    runningProcesses,
    isLoading,
    isProjectRunning,
    getRunningCount,
    refresh: load
  }
}
