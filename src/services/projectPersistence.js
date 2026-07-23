import { normaliseProject } from '../model/project'
import { parseProjectObject, parseProjectText, serialiseProject } from '../utils/projectSchema'

export const PROJECT_STORAGE_KEY = 'gantt-app-v1'

function toRuntimeProject(project) {
  return normaliseProject({
    tasks: project.tasks,
    chartTitle: project.title,
    categoryColors: project.categoryColors,
  })
}

export function loadStoredProject(storage = window.localStorage) {
  try {
    const raw = storage.getItem(PROJECT_STORAGE_KEY)
    if (!raw) return normaliseProject(null)
    const result = parseProjectObject(JSON.parse(raw))
    return result.project && result.errors.length === 0
      ? toRuntimeProject(result.project)
      : normaliseProject(null)
  } catch {
    return normaliseProject(null)
  }
}

export function saveStoredProject(project, storage = window.localStorage) {
  const candidate = serialiseProject(normaliseProject(project))
  const result = parseProjectObject(candidate)
  if (!result.project || result.errors.length) throw new Error(result.errors[0]?.message || 'Project validation failed')
  storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(result.project))
}

export function parseProjectFile(contents) {
  const result = parseProjectText(contents)
  if (!result.project || result.errors.length) throw new Error(result.errors[0]?.message || 'Project validation failed')
  return toRuntimeProject(result.project)
}

export function downloadProject(project, documentObject = document, urlObject = URL) {
  const candidate = serialiseProject(normaliseProject(project))
  const result = parseProjectObject(candidate)
  if (!result.project || result.errors.length) throw new Error(result.errors[0]?.message || 'Project validation failed')
  const blob = new Blob([JSON.stringify(result.project, null, 2)], { type: 'application/json' })
  const link = documentObject.createElement('a')
  link.href = urlObject.createObjectURL(blob)
  link.download = 'gantt-project.json'
  link.click()
  urlObject.revokeObjectURL(link.href)
}

export function readProjectFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => {
      try { resolve(parseProjectFile(event.target.result)) } catch (error) { reject(error) }
    }
    reader.onerror = () => reject(new Error('Project file could not be read'))
    reader.readAsText(file)
  })
}
