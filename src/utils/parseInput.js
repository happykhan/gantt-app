import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { isIsoDate, isValidColour, validateProject } from './projectSchema'

const ALIASES = {
  id: ['id', 'task id', 'task_id'],
  name: ['task', 'task name', 'name', 'activity', 'item', 'work package', 'wp', 'title', 'description'],
  start: ['start', 'start date', 'begin', 'begin date', 'from', 'start_date'],
  end: ['end', 'end date', 'finish', 'finish date', 'due', 'due date', 'to', 'until', 'end_date'],
  category: ['category', 'phase', 'group', 'type', 'section', 'label', 'workpackage', 'work package'],
  progress: ['progress', '%', '% complete', 'done', 'completion', 'percent'],
  dependencies: ['dependencies', 'deps', 'depends on', 'after', 'predecessors', 'requires'],
  colour: ['colour', 'color', 'category colour', 'category color'],
}

function normalise(value) {
  return String(value ?? '').toLowerCase().trim()
}

function matchColumn(header) {
  const value = normalise(header)
  for (const [key, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(value)) return key
  }
  return null
}

function calendarDate(year, month, day) {
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return isIsoDate(iso) ? iso : null
}

export function parseDateValue(rawValue) {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    const parsed = XLSX.SSF.parse_date_code(rawValue)
    const value = parsed && calendarDate(parsed.y, parsed.m, parsed.d)
    return value
      ? { value, error: null }
      : { value: '', error: 'is not a valid Excel date serial' }
  }

  const text = String(rawValue ?? '').trim()
  if (!text) return { value: '', error: 'is required' }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return isIsoDate(text)
      ? { value: text, error: null }
      : { value: text, error: 'is not a valid calendar date' }
  }

  const british = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (british) {
    const value = calendarDate(Number(british[3]), Number(british[2]), Number(british[1]))
    return value
      ? { value, error: null }
      : { value: text, error: 'is not a valid British date (DD/MM/YYYY)' }
  }

  return {
    value: text,
    error: 'must use ISO YYYY-MM-DD or British DD/MM/YYYY format',
  }
}

function parseProgress(rawValue) {
  if (rawValue == null || String(rawValue).trim() === '') return { value: 0, error: null }
  const text = String(rawValue).trim()
  const number = Number(text.endsWith('%') ? text.slice(0, -1) : text)
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    return { value: number, error: 'must be a number from 0 to 100' }
  }
  return { value: number, error: null }
}

function addError(errors, row, field, message) {
  errors.push({ row, field, message: `${field[0].toUpperCase()}${field.slice(1)} ${message}.` })
}

function dedupeErrors(errors) {
  const seen = new Set()
  return errors.filter(item => {
    const key = `${String(item.row)}:${item.field}:${item.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function resolveDependencies(tasks, rawDependencies, rowNumbers, errors) {
  const idSet = new Set(tasks.map(task => task.id))
  const names = new Map()
  tasks.forEach(task => {
    const key = task.name.toLowerCase()
    names.set(key, [...(names.get(key) || []), task.id])
  })

  tasks.forEach((task, index) => {
    const references = rawDependencies[index]
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
    const resolved = references.map(reference => {
      if (idSet.has(reference)) return reference

      if (/^\d+$/.test(reference)) {
        const position = Number(reference) - 1
        if (position >= 0 && position < tasks.length) return tasks[position].id
      }

      const matches = names.get(reference.toLowerCase()) || []
      if (matches.length === 1) return matches[0]
      if (matches.length > 1) {
        addError(errors, rowNumbers[index], 'dependencies', `reference “${reference}” matches more than one task name`)
        return reference
      }

      addError(errors, rowNumbers[index], 'dependencies', `reference “${reference}” does not match a task ID, row number or unique task name`)
      return reference
    })
    task.dependencies = resolved.join(', ')
  })
}

export function parseTableData(inputRows) {
  const rows = inputRows
    .map(row => Array.isArray(row) ? row.map(cell => cell ?? '') : [])
    .filter(row => row.some(cell => String(cell).trim() !== ''))

  if (!rows.length) {
    return { tasks: [], categoryColors: {}, errors: [{ row: null, field: 'data', message: 'No rows were found.' }] }
  }

  const hasHeader = rows[0].some(cell => matchColumn(cell) !== null)
  const headers = hasHeader
    ? rows[0]
    : ['Task Name', 'Start Date', 'End Date', 'Category', 'Progress', 'Dependencies', 'ID', 'Colour']
  const dataRows = hasHeader ? rows.slice(1) : rows
  const firstDataRowNumber = hasHeader ? 2 : 1
  const columns = {}

  headers.forEach((header, index) => {
    const key = matchColumn(header)
    if (key && columns[key] == null) columns[key] = index
  })

  const errors = []
  for (const required of ['name', 'start', 'end']) {
    if (columns[required] == null) {
      errors.push({ row: null, field: required, message: `A ${required} column is required.` })
    }
  }

  const tasks = []
  const rowNumbers = []
  const rawDependencies = []
  const categoryColors = {}

  dataRows.forEach((row, index) => {
    const rowNumber = firstDataRowNumber + index
    const read = field => columns[field] == null ? '' : row[columns[field]]
    const name = String(read('name') ?? '').trim()
    const suppliedId = String(read('id') ?? '').trim()
    const start = parseDateValue(read('start'))
    const end = parseDateValue(read('end'))
    const progress = parseProgress(read('progress'))
    const category = String(read('category') ?? '').trim()
    const colour = String(read('colour') ?? '').trim()

    if (!name) addError(errors, rowNumber, 'name', 'is required')
    if (start.error) addError(errors, rowNumber, 'start', start.error)
    if (end.error) addError(errors, rowNumber, 'end', end.error)
    if (progress.error) addError(errors, rowNumber, 'progress', progress.error)
    if (colour && !category) addError(errors, rowNumber, 'colour', 'requires a category')
    if (colour && !isValidColour(colour)) addError(errors, rowNumber, 'colour', 'must be a 3- or 6-digit hex colour')
    if (colour && category && isValidColour(colour)) {
      if (categoryColors[category] && categoryColors[category].toLowerCase() !== colour.toLowerCase()) {
        addError(errors, rowNumber, 'colour', `conflicts with the earlier colour for “${category}”`)
      } else {
        categoryColors[category] = colour.toLowerCase()
      }
    }

    tasks.push({
      id: suppliedId || `task-${index + 1}`,
      name,
      start: start.value,
      end: end.value,
      progress: progress.value,
      category,
      dependencies: '',
    })
    rowNumbers.push(rowNumber)
    rawDependencies.push(String(read('dependencies') ?? '').trim())
  })

  resolveDependencies(tasks, rawDependencies, rowNumbers, errors)
  const validation = validateProject({ title: '', tasks, categoryColors })
  validation.errors.forEach(item => {
    errors.push({ ...item, row: item.row == null ? null : rowNumbers[item.row - 1] })
  })

  return {
    tasks: validation.project.tasks,
    categoryColors: validation.project.categoryColors,
    errors: dedupeErrors(errors),
  }
}

export function parseExcelFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) {
    return { tasks: [], categoryColors: {}, errors: [{ row: null, field: 'file', message: 'The workbook has no worksheets.' }] }
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true })
  return parseTableData(rows)
}

export function parsePastedText(text) {
  if (!text.trim()) {
    return { tasks: [], categoryColors: {}, errors: [{ row: null, field: 'data', message: 'No rows were found.' }] }
  }

  const parsed = Papa.parse(text, {
    delimitersToGuess: ['\t', ','],
    skipEmptyLines: 'greedy',
  })
  const result = parseTableData(parsed.data)
  const syntaxErrors = parsed.errors.map(item => ({
    row: typeof item.row === 'number' ? item.row + 1 : null,
    field: 'CSV',
    message: item.message,
  }))
  return { ...result, errors: dedupeErrors([...syntaxErrors, ...result.errors]) }
}

export function generateSampleData() {
  const base = new Date()
  base.setDate(1)
  const format = date => date.toISOString().substring(0, 10)
  const addMonths = (date, months) => {
    const result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
  }

  return [
    { id: 'task-1', name: 'Systematic literature review', start: format(base), end: format(addMonths(base, 3)), progress: 0, category: 'WP1', dependencies: '' },
    { id: 'task-2', name: 'Establish experimental protocols', start: format(addMonths(base, 1)), end: format(addMonths(base, 6)), progress: 0, category: 'WP1', dependencies: '' },
    { id: 'task-3', name: 'Recruit study cohort', start: format(addMonths(base, 6)), end: format(addMonths(base, 12)), progress: 0, category: 'WP1', dependencies: 'task-2' },
    { id: 'task-4', name: 'Sample collection & processing', start: format(addMonths(base, 12)), end: format(addMonths(base, 18)), progress: 0, category: 'WP2', dependencies: 'task-3' },
    { id: 'task-5', name: 'Genomic sequencing', start: format(addMonths(base, 18)), end: format(addMonths(base, 21)), progress: 0, category: 'WP2', dependencies: 'task-4' },
    { id: 'task-6', name: 'Phenotypic characterisation', start: format(addMonths(base, 18)), end: format(addMonths(base, 24)), progress: 0, category: 'WP2', dependencies: 'task-4' },
    { id: 'task-7', name: 'Develop analysis pipeline', start: format(addMonths(base, 6)), end: format(addMonths(base, 15)), progress: 0, category: 'WP3', dependencies: '' },
    { id: 'task-8', name: 'Genome-wide association study', start: format(addMonths(base, 21)), end: format(addMonths(base, 27)), progress: 0, category: 'WP3', dependencies: 'task-5, task-7' },
    { id: 'task-9', name: 'Functional validation experiments', start: format(addMonths(base, 27)), end: format(addMonths(base, 33)), progress: 0, category: 'WP3', dependencies: 'task-8' },
    { id: 'task-10', name: 'Conference presentations', start: format(addMonths(base, 12)), end: format(addMonths(base, 36)), progress: 0, category: 'WP4', dependencies: '' },
    { id: 'task-11', name: 'Manuscript preparation', start: format(addMonths(base, 27)), end: format(addMonths(base, 34)), progress: 0, category: 'WP4', dependencies: 'task-8' },
    { id: 'task-12', name: 'Submit papers & final report', start: format(addMonths(base, 34)), end: format(addMonths(base, 36)), progress: 0, category: 'WP4', dependencies: 'task-11' },
  ]
}
