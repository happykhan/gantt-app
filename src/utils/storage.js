import { parseProjectObject, serialiseProject } from './projectSchema'

export const AUTOSAVE_KEY = 'gantt-app-v1'
export const AUTOSAVE_BACKUP_KEY = 'gantt-app-v1-backup'
export const SETTINGS_KEY = 'gantt-app-settings-v1'

export const DEFAULT_COLUMN_WIDTHS = {
  name: 160,
  start: 82,
  end: 82,
  dur: 52,
  category: 110,
  progress: 52,
  deps: 130,
}

const VIEW_MODES = ['Week', 'Month', 'Quarter', 'Year']
const LABEL_MODES = ['inline', 'classic']
const DENSITIES = ['compact', 'normal', 'spacious']
const FONTS = [
  'inherit',
  'Inter, system-ui, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  "'Times New Roman', serif",
  "'Courier New', monospace",
]

function numberInRange(value, fallback, minimum, maximum) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : fallback
}

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function parseJson(value) {
  if (!value) return null
  try { return JSON.parse(value) } catch { return null }
}

function readLegacySettings(storage) {
  const read = key => {
    try { return storage.getItem(key) } catch { return null }
  }
  return {
    viewMode: read('gantt-viewMode'),
    labelMode: read('gantt-labelMode'),
    zoom: read('gantt-zoom'),
    displayDensity: read('gantt-density'),
    chartFont: read('gantt-font'),
    chartFontSize: read('gantt-fontsize'),
    exportScale: read('gantt-exportScale'),
    tableHeight: read('gantt-tableHeight'),
    labelWidth: read('gantt-labelWidth'),
    columnWidths: parseJson(read('gantt-colWidths')),
  }
}

export function normaliseDisplaySettings(input = {}, viewportWidth = 1200) {
  const mobile = viewportWidth < 900
  const columns = input.columnWidths && typeof input.columnWidths === 'object' && !Array.isArray(input.columnWidths)
    ? input.columnWidths
    : {}
  return {
    viewMode: oneOf(input.viewMode, VIEW_MODES, mobile ? 'Year' : 'Quarter'),
    labelMode: oneOf(input.labelMode, LABEL_MODES, 'inline'),
    zoom: numberInRange(input.zoom, 1, 0.5, 2),
    displayDensity: oneOf(input.displayDensity, DENSITIES, 'normal'),
    chartFont: oneOf(input.chartFont, FONTS, 'inherit'),
    chartFontSize: numberInRange(input.chartFontSize, 11, 6, 32),
    exportScale: numberInRange(input.exportScale, 2, 1, 4),
    showTable: typeof input.showTable === 'boolean' ? input.showTable : !mobile,
    tableHeight: numberInRange(input.tableHeight, 240, 80, 600),
    labelWidth: numberInRange(input.labelWidth, 160, 60, Math.max(160, viewportWidth * 0.6)),
    columnWidths: Object.fromEntries(Object.entries(DEFAULT_COLUMN_WIDTHS).map(([key, fallback]) => [
      key,
      numberInRange(columns[key], fallback, key === 'dur' || key === 'progress' ? 36 : 50, 1000),
    ])),
  }
}

export function loadDisplaySettings(storage, viewportWidth) {
  let saved = null
  try { saved = parseJson(storage.getItem(SETTINGS_KEY)) } catch { /* Storage may be unavailable. */ }
  const source = saved && typeof saved === 'object' && !Array.isArray(saved)
    ? saved
    : readLegacySettings(storage)
  return normaliseDisplaySettings(source, viewportWidth)
}

export function saveDisplaySettings(storage, settings) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(normaliseDisplaySettings(settings, window.innerWidth)))
    return true
  } catch {
    return false
  }
}

function readProject(raw) {
  if (!raw) return null
  try {
    const result = parseProjectObject(JSON.parse(raw))
    return result.project && result.errors.length === 0 ? result.project : null
  } catch {
    return null
  }
}

export function loadAutosave(storage) {
  try {
    const current = readProject(storage.getItem(AUTOSAVE_KEY))
    const project = current || readProject(storage.getItem(AUTOSAVE_BACKUP_KEY))
    if (project) {
      return {
        tasks: project.tasks,
        chartTitle: project.title,
        categoryColors: project.categoryColors,
      }
    }
  } catch { /* Storage may be unavailable. */ }
  return { tasks: [], chartTitle: '', categoryColors: {} }
}

export function saveAutosave(storage, project) {
  const candidate = serialiseProject(project)
  const result = parseProjectObject(candidate)
  if (!result.project || result.errors.length) return false

  try {
    const currentRaw = storage.getItem(AUTOSAVE_KEY)
    if (readProject(currentRaw)) storage.setItem(AUTOSAVE_BACKUP_KEY, currentRaw)
    storage.setItem(AUTOSAVE_KEY, JSON.stringify(result.project))
    return true
  } catch {
    return false
  }
}

