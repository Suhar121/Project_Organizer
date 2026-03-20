import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:6001'
})

export interface Project {
  id: string
  name: string
  description: string
  path: string
  tags: string[]
  commands?: ProjectCommand[]
  isPinned?: boolean
  rootFolder?: string | null
  status: string
  updatedAt?: string
  git?: {
    isGitRepo: boolean
    branch: string | null
    hasUncommittedChanges: boolean
    needsPush: boolean
    lastCommitHash?: string
  }
}

export interface ProjectCommand {
  id: string
  label: string
  command: string
  workingDir?: string
}

export interface KanbanTicket {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'done' | 'backlog' | 'doing'
  priority?: 'low' | 'medium' | 'high'
  projectId?: string
  order?: number
  createdAt: string
}

export interface ProjectIdea {
  id: string
  title: string
  description: string
  status?: string
  createdAt: string
}

export interface SystemOverview {
  cpuUsagePercent: number | null
  memory: {
    usedGb: number
    totalGb: number
    usagePercent: number
  }
  disks: Array<{
    drive: string;
    usedGb: number;
    totalGb: number;
    usagePercent: number;
  }>;
  timestamp: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface PortEntry {
  host: string
  port: number
  pid: number
  processName: string
  projectName: string | null
  alias?: string | null
}

export interface PortAlias {
  port: number
  alias: string
}

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  mtime: string
}

export interface ActivityEntry {
  id: string
  timestamp: string
  action: 'run' | 'open-vscode' | 'open-folder' | 'run-command' | string
  status: 'success' | 'failed' | string
  projectName: string | null
  path: string
  details: string
}

export interface RunningProcess {
  runId: string
  projectId: string
  commandId: string
  startedAt: string
  pid: number | null
}

export interface ScannedFolder {
  name: string
  path: string
  hasGit: boolean
  hasPackageJson: boolean
}

export interface Note {
  id: string
  content: string
  createdAt: string
  projectId?: string
}

export interface LLMSettings {
  provider: string
  apiKey: string
  baseURL: string
  model: string
}

export const fetchNotes = async (projectId?: string): Promise<Note[]> => {
  const { data } = await api.get('/notes', { params: { projectId } })
  return data
}

export const createNote = async (projectId: string | null, content: string): Promise<Note> => {
  const { data } = await api.post('/notes', { projectId, content })
  return data
}

export const updateNote = async (_projectId: string, id: string, content: string): Promise<Note> => {
  const { data } = await api.put(`/notes/${id}`, { content })
  return data
}

export const deleteNote = async (_projectId: string, id: string): Promise<void> => {
  await api.delete(`/notes/${id}`)
}

export const fetchSettings = async (): Promise<LLMSettings> => {
  const { data } = await api.get('/settings')
  return data
}

export const updateSettings = async (settings: LLMSettings): Promise<void> => {
  await api.put('/settings', settings)
}

export const fetchProjects = async (): Promise<Project[]> => {
  const { data } = await api.get('/projects')
  return data
}

export const fetchProjectFiles = async (id: string, subPath: string = ''): Promise<{ isDirectory: boolean, files?: FileEntry[] }> => {
  const { data } = await api.get(`/projects/${id}/files`, { params: { subPath } })
  return data
}

export const addProject = async (project: Omit<Project, 'id' | 'status'>): Promise<Project> => {
  const { data } = await api.post('/projects', project)
  return data
}

export const scanMainFolder = async (mainFolderPath: string): Promise<{ folders: ScannedFolder[] }> => {
  const { data } = await api.post('/folders/scan', { path: mainFolderPath })
  return data
}

export const bulkAddProjects = async (payload: {
  mainFolderPath: string
  selectedPaths: string[]
  tags?: string[]
  descriptionPrefix?: string
  isPinned?: boolean
}): Promise<{ created: Project[]; skipped: number }> => {
  const { data } = await api.post('/projects/bulk-add', payload)
  return data
}

export const updateProject = async (id: string, project: Partial<Project>): Promise<Project> => {
  const { data } = await api.put(`/projects/${id}`, project)
  return data
}

export const deleteProject = async (id: string): Promise<void> => {
  await api.delete(`/projects/${id}`)
}

export const runProject = async (path: string): Promise<{ message: string }> => {
  const { data } = await api.post('/run', { path })
  return data
}

export const openVSCode = async (path: string): Promise<{ message: string }> => {
  const { data } = await api.post('/open-vscode', { path })
  return data
}

export const openFolder = async (path: string): Promise<{ message: string }> => {
  const { data } = await api.post('/open-folder', { path })
  return data
}

export const runProjectCommand = async (
  projectId: string,
  payload: { commandId?: string; label?: string; command?: string; workingDir?: string }
): Promise<{ message: string }> => {
  const { data } = await api.post(`/projects/${projectId}/commands/run`, payload)
  return data
}

export const fetchSystemOverview = async (): Promise<SystemOverview> => {
  const { data } = await api.get('/system/overview')
  return data
}

export const fetchPorts = async (): Promise<{ ports: PortEntry[] }> => {
  const { data } = await api.get('/system/ports')
  return data
}

export const fetchPortAliases = async (): Promise<PortAlias[]> => {
  const { data } = await api.get('/system/ports/aliases')
  return data
}

export const setPortAlias = async (port: number, alias: string): Promise<PortAlias> => {
  const { data } = await api.post('/system/ports/aliases', { port, alias })
  return data
}

export const fetchActivity = async (): Promise<{ entries: ActivityEntry[] }> => {
  const { data } = await api.get('/activity')
  return data
}

export const fetchRunningProcesses = async (): Promise<{ processes: RunningProcess[] }> => {
  const { data } = await api.get('/running-processes')
  return data
}

export const killProcess = async (pid: number): Promise<{ message: string }> => {
  const { data } = await api.post('/system/processes/kill', { pid })
  return data
}

export const fetchLabels = async (): Promise<Label[]> => {
  const { data } = await api.get('/labels')
  return data
}

export const createLabel = async (label: Omit<Label, 'id'>): Promise<Label> => {
  const { data } = await api.post('/labels', label)
  return data
}

export const deleteLabel = async (id: string): Promise<void> => {
  await api.delete(`/labels/${id}`)
}

// Kanban API
export const fetchKanbanTickets = async (): Promise<KanbanTicket[]> => {
  const { data } = await api.get('/kanban/tickets')
  return data
}

export const createKanbanTicket = async (ticket: Partial<KanbanTicket>): Promise<KanbanTicket> => {
  const { data } = await api.post('/kanban/tickets', ticket)
  return data
}

export const updateKanbanTicket = async (id: string, ticket: Partial<KanbanTicket>): Promise<KanbanTicket> => {
  const { data } = await api.put(`/kanban/tickets/${id}`, ticket)
  return data
}

export const deleteKanbanTicket = async (id: string): Promise<void> => {
  await api.delete(`/kanban/tickets/${id}`)
}

// Project Ideas API
export const fetchProjectIdeas = async (): Promise<ProjectIdea[]> => {
  const { data } = await api.get('/ideas')
  return data
}

export const createProjectIdea = async (idea: Partial<ProjectIdea>): Promise<ProjectIdea> => {
  const { data } = await api.post('/ideas', idea)
  return data
}

export const deleteProjectIdea = async (id: string): Promise<void> => {
  await api.delete(`/ideas/${id}`)
}
