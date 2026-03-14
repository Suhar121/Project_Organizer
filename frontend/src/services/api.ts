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
  status: string
}

export const fetchProjects = async (): Promise<Project[]> => {
  const { data } = await api.get('/projects')
  return data
}

export const addProject = async (project: Omit<Project, 'id' | 'status'>): Promise<Project> => {
  const { data } = await api.post('/projects', project)
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
