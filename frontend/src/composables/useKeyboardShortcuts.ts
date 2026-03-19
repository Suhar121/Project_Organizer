import { onMounted, onUnmounted } from 'vue'

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  const handler = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    const combo = [
      e.ctrlKey && 'ctrl',
      e.metaKey && 'meta',
      e.altKey && 'alt',
      e.shiftKey && 'shift',
      key
    ].filter(Boolean).join('+')

    // Normalize: treat Cmd (meta) same as Ctrl for cross-platform
    const normalizedCombo = combo.replace('meta+', 'ctrl+')

    if (shortcuts[normalizedCombo]) {
      e.preventDefault()
      shortcuts[normalizedCombo]()
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))
}
