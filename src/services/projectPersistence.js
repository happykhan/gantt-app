import { normaliseProject } from '../model/project'

export const PROJECT_STORAGE_KEY = 'gantt-app-v1'

export function loadStoredProject(storage = window.localStorage) {
  try {
    const raw = storage.getItem(PROJECT_STORAGE_KEY)
    return raw ? normaliseProject(JSON.parse(raw)) : normaliseProject(null)
  } catch {
    return normaliseProject(null)
  }
}

export function saveStoredProject(project, storage = window.localStorage) {
  storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(normaliseProject(project)))
}

export function parseProjectFile(contents) {
  const parsed = normaliseProject(JSON.parse(contents))
  if (!parsed.tasks.length) throw new Error('No tasks found in project file')
  return parsed
}

export function downloadProject(project, documentObject = document, urlObject = URL) {
  const blob = new Blob([JSON.stringify(normaliseProject(project), null, 2)], { type: 'application/json' })
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
