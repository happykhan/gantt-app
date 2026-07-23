let idCounter = 0

export const EMPTY_PROJECT = Object.freeze({
  tasks: [],
  chartTitle: '',
  categoryColors: {},
})

export function makeTaskId(now = Date.now()) {
  idCounter += 1
  return `task-${now}-${idCounter}`
}

export function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().substring(0, 10)
}

export function normaliseProject(value) {
  if (!value || typeof value !== 'object') return { ...EMPTY_PROJECT }
  return {
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    chartTitle: typeof value.chartTitle === 'string' ? value.chartTitle : typeof value.title === 'string' ? value.title : '',
    categoryColors: value.categoryColors && typeof value.categoryColors === 'object' && !Array.isArray(value.categoryColors)
      ? value.categoryColors
      : {},
  }
}

export function withTaskIds(tasks) {
  return tasks.map(task => ({ ...task, id: task.id || makeTaskId() }))
}

export function createTask(tasks, today = new Date().toISOString().substring(0, 10)) {
  const previous = tasks[tasks.length - 1]
  const start = previous?.end || today
  return {
    id: makeTaskId(),
    name: 'New task',
    start,
    end: addDays(start, 30),
    category: previous?.category || '',
    dependencies: '',
    progress: 0,
  }
}

export function updateTask(tasks, taskId, changes) {
  return tasks.map(task => task.id === taskId ? { ...task, ...changes } : task)
}

export function deleteTask(tasks, taskId) {
  return tasks
    .filter(task => task.id !== taskId)
    .map(task => ({
      ...task,
      dependencies: task.dependencies
        ? task.dependencies.split(',').map(value => value.trim()).filter(dependency => dependency !== taskId).join(', ')
        : '',
    }))
}

export function moveTask(tasks, taskId, direction) {
  const index = tasks.findIndex(task => task.id === taskId)
  const destination = index + direction
  if (index < 0 || destination < 0 || destination >= tasks.length) return tasks
  const reordered = [...tasks]
  ;[reordered[index], reordered[destination]] = [reordered[destination], reordered[index]]
  return reordered
}

export function renameCategory(tasks, oldCategory, newCategory) {
  const trimmed = newCategory.trim()
  if (!trimmed || trimmed === oldCategory) return tasks
  return tasks.map(task => task.category === oldCategory ? { ...task, category: trimmed } : task)
}

export function renameCategoryColour(categoryColors, oldCategory, newCategory) {
  const trimmed = newCategory.trim()
  if (!trimmed || trimmed === oldCategory || categoryColors[oldCategory] === undefined) return categoryColors
  const renamed = { ...categoryColors, [trimmed]: categoryColors[oldCategory] }
  delete renamed[oldCategory]
  return renamed
}

export function getCategories(tasks) {
  return [...new Set(tasks.map(task => task.category).filter(Boolean))]
}
