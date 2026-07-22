import { validateDependencyGraph } from './dependencyGraph'

export const PROJECT_SCHEMA_VERSION = 1

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/
const HEX_COLOUR_PATTERN = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/

export function isIsoDate(value) {
  if (typeof value !== 'string') return false
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

export function isValidColour(value) {
  return typeof value === 'string' && HEX_COLOUR_PATTERN.test(value)
}

function error(row, field, message) {
  return { row, field, message }
}

function normaliseLegacyTask(task, index) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) return task
  return {
    ...task,
    id: task.id ?? `task-${index + 1}`,
    progress: task.progress ?? 0,
    category: task.category ?? '',
    dependencies: Array.isArray(task.dependencies)
      ? task.dependencies.join(', ')
      : task.dependencies ?? '',
  }
}

function migrateProject(input) {
  if (Array.isArray(input)) {
    return {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      title: '',
      tasks: input.map(normaliseLegacyTask),
      categoryColors: {},
    }
  }

  if (!input || typeof input !== 'object') {
    throw new Error('The project file must contain a JSON object.')
  }

  if (input.schemaVersion != null && input.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    throw new Error(`Project schema version ${String(input.schemaVersion)} is not supported.`)
  }

  const isLegacy = input.schemaVersion == null
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    title: input.title ?? input.chartTitle ?? '',
    tasks: isLegacy && Array.isArray(input.tasks)
      ? input.tasks.map(normaliseLegacyTask)
      : input.tasks,
    categoryColors: input.categoryColors ?? input.colors ?? {},
  }
}

export function validateProject(project) {
  const errors = []
  const normalised = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    title: typeof project.title === 'string' ? project.title : '',
    tasks: [],
    categoryColors: {},
  }

  if (typeof project.title !== 'string') {
    errors.push(error(null, 'title', 'Project title must be text.'))
  }

  if (!project.categoryColors || typeof project.categoryColors !== 'object' || Array.isArray(project.categoryColors)) {
    errors.push(error(null, 'categoryColors', 'Project colours must be an object keyed by category.'))
  } else {
    Object.entries(project.categoryColors).forEach(([category, colour]) => {
      if (!category.trim()) {
        errors.push(error(null, 'categoryColors', 'Colour categories cannot be empty.'))
      } else if (!isValidColour(colour)) {
        errors.push(error(null, 'categoryColors', `Colour for “${category}” must be a 3- or 6-digit hex colour.`))
      } else {
        normalised.categoryColors[category] = colour.toLowerCase()
      }
    })
  }

  if (!Array.isArray(project.tasks)) {
    errors.push(error(null, 'tasks', 'Project tasks must be an array.'))
    return { project: normalised, errors }
  }

  const taskRows = []
  project.tasks.forEach((rawTask, index) => {
    const row = index + 1
    if (!rawTask || typeof rawTask !== 'object' || Array.isArray(rawTask)) {
      errors.push(error(row, 'task', 'Task must be an object.'))
      return
    }

    const task = {
      id: typeof rawTask.id === 'string' ? rawTask.id.trim() : '',
      name: typeof rawTask.name === 'string' ? rawTask.name.trim() : '',
      start: typeof rawTask.start === 'string' ? rawTask.start.trim() : '',
      end: typeof rawTask.end === 'string' ? rawTask.end.trim() : '',
      progress: rawTask.progress,
      category: typeof rawTask.category === 'string' ? rawTask.category.trim() : '',
      dependencies: typeof rawTask.dependencies === 'string' ? rawTask.dependencies.trim() : '',
      ...(rawTask.color == null || rawTask.color === '' ? {} : { color: rawTask.color }),
    }

    if (task.id && !ID_PATTERN.test(task.id)) {
      errors.push(error(row, 'id', 'Task ID may only contain letters, numbers, dots, underscores, colons and hyphens.'))
    }

    if (!task.name) errors.push(error(row, 'name', 'Task name is required.'))
    if (!isIsoDate(task.start)) errors.push(error(row, 'start', 'Start date must be a valid ISO date (YYYY-MM-DD).'))
    if (!isIsoDate(task.end)) errors.push(error(row, 'end', 'End date must be a valid ISO date (YYYY-MM-DD).'))
    if (isIsoDate(task.start) && isIsoDate(task.end) && task.end < task.start) {
      errors.push(error(row, 'end', 'End date cannot be before the start date.'))
    }
    if (typeof task.progress !== 'number' || !Number.isFinite(task.progress) || task.progress < 0 || task.progress > 100) {
      errors.push(error(row, 'progress', 'Progress must be a number from 0 to 100.'))
    }
    if (typeof rawTask.category !== 'string') errors.push(error(row, 'category', 'Category must be text.'))
    if (typeof rawTask.dependencies !== 'string') errors.push(error(row, 'dependencies', 'Dependencies must be a comma-separated list of task IDs.'))
    if (rawTask.color != null && rawTask.color !== '' && !isValidColour(rawTask.color)) {
      errors.push(error(row, 'color', 'Task colour must be a 3- or 6-digit hex colour.'))
    } else if (task.color) {
      task.color = task.color.toLowerCase()
    }

    normalised.tasks.push(task)
    taskRows.push(row)
  })

  const graph = validateDependencyGraph(normalised.tasks)
  graph.errors.forEach(item => {
    errors.push(error(
      taskRows[item.taskIndex] ?? null,
      item.code.includes('task-id') ? 'id' : 'dependencies',
      item.message,
    ))
  })

  return { project: normalised, errors }
}

export function parseProjectObject(input) {
  try {
    return validateProject(migrateProject(input))
  } catch (caught) {
    return {
      project: null,
      errors: [error(null, 'project', caught instanceof Error ? caught.message : 'Could not read project file.')],
    }
  }
}

export function parseProjectText(text) {
  try {
    return parseProjectObject(JSON.parse(text))
  } catch {
    return {
      project: null,
      errors: [error(null, 'project', 'The file is not valid JSON.')],
    }
  }
}

export function serialiseProject({ tasks, chartTitle, categoryColors }) {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    title: chartTitle,
    tasks,
    categoryColors,
  }
}
