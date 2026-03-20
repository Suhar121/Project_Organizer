import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:6001'
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

export interface Label {
  id: string
  name: string
  color: string
}

export interface LLMSettings {
  provider: string
  apiKey: string
  baseURL: string
  model: string
}

export const fetchNotes = async (projectId?: string): Promise<Note[]> => []
export const createNote = async (projectId: string | null, content: string): Promise<Note> => ({ id: '1', content, createdAt: new Date().toISOString(), projectId: projectId || undefined })
export const updateNote = async (projectId: string, id: string, content: string): Promise<Note> => ({ id, content, createdAt: new Date().toISOString() })
export const deleteNote = async (projectId: string, id: string): Promise<void> => {}


export const fetchSettings = async (): Promise<LLMSettings> => ({ provider: 'openai', apiKey: '', baseURL: '', model: '' })
export const updateSettings = async (settings: LLMSettings): Promise<void> => {}

export const fetchProjects = async (): Promise<Project[]> => {
  const { data } = await api.get('/projects')
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

