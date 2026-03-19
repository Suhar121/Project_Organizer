import { computed, type Ref } from 'vue'
import type { Project, ActivityEntry } from '../services/api'

const RELEVANT_ACTIONS = ['run', 'run-command', 'open-vscode', 'open-folder']

export function useRecentProjects(
  activityEntries: Ref<ActivityEntry[]>,
  projects: Ref<Project[]>,
  limit = 8
) {
  const recentProjects = computed(() => {
    // Filter to relevant actions with project names
    const relevantEntries = activityEntries.value.filter(
      entry => RELEVANT_ACTIONS.includes(entry.action) && entry.projectName
    )

    // Deduplicate by project name, keep most recent
    const seen = new Set<string>()
    const uniqueProjectNames: string[] = []

    for (const entry of relevantEntries) {
      const name = entry.projectName!
      if (!seen.has(name)) {
        seen.add(name)
        uniqueProjectNames.push(name)
      }
      if (uniqueProjectNames.length >= limit) break
    }

    // Match to actual Project objects (for full data)
    return uniqueProjectNames
      .map(name => projects.value.find(p => p.name === name))
      .filter((p): p is Project => !!p)
  })

  return { recentProjects }
}
