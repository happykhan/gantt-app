import * as XLSX from 'xlsx'

// Column name aliases
const ALIASES = {
  name: ['task', 'task name', 'name', 'activity', 'item', 'work package', 'wp', 'title', 'description'],
  start: ['start', 'start date', 'begin', 'begin date', 'from', 'start_date'],
  end: ['end', 'end date', 'finish', 'finish date', 'due', 'due date', 'to', 'until', 'end_date'],
  category: ['category', 'phase', 'group', 'type', 'section', 'label', 'workpackage', 'work package'],
  progress: ['progress', '%', '% complete', 'done', 'completion', 'percent'],
  dependencies: ['dependencies', 'deps', 'depends on', 'after', 'predecessors', 'requires'],
}

function normalise(str) {
  return String(str || '').toLowerCase().trim()
}

function matchColumn(header) {
  const h = normalise(header)
  for (const [key, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(h)) return key
  }
  return null
}

// Parse Excel serial date or various date string formats → YYYY-MM-DD
function parseDate(val) {
  if (!val && val !== 0) return null
  // Excel serial date (number)
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = String(val).trim()
  if (!s) return null

  // Try native Date parsing first
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)

  // DD/MM/YYYY or MM/DD/YYYY — try both, prefer DD/MM/YYYY (European)
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, a, b, y] = slashMatch
    // Heuristic: if first part > 12, it must be day
    if (parseInt(a) > 12) return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
    return `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
  }

  // DD-MM-YYYY or MM-DD-YYYY
  const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dashMatch) {
    const [, a, b, y] = dashMatch
    if (parseInt(a) > 12) return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
    return `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
  }

  // Month name formats: "Jan 2024", "January 2024"
  const monthYear = s.match(/^(\w+)\s+(\d{4})$/)
  if (monthYear) {
    const d = new Date(`1 ${monthYear[1]} ${monthYear[2]}`)
    if (!isNaN(d)) return d.toISOString().substring(0, 10)
  }

  // "15 Jan 2024", "15 January 2024"
  const dayMonthYear = s.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/)
  if (dayMonthYear) {
    const d = new Date(`${dayMonthYear[1]} ${dayMonthYear[2]} ${dayMonthYear[3]}`)
    if (!isNaN(d)) return d.toISOString().substring(0, 10)
  }

  // Try generic parse
  const d = new Date(s)
  if (!isNaN(d)) return d.toISOString().substring(0, 10)

  return null
}

function rowsToTasks(rows, colMap) {
  const today = new Date().toISOString().substring(0, 10)
  const tasks = []

  rows.forEach((row, i) => {
    const name = String(colMap.name != null ? row[colMap.name] || '' : '').trim()
    if (!name) return

    const startRaw = colMap.start != null ? row[colMap.start] : null
    const endRaw = colMap.end != null ? row[colMap.end] : null

    const start = parseDate(startRaw) || today
    const end = parseDate(endRaw) || start

    const progress = colMap.progress != null
      ? Math.min(100, Math.max(0, parseFloat(row[colMap.progress]) || 0))
      : 0

    const category = colMap.category != null ? String(row[colMap.category] || '').trim() : ''
    const deps = colMap.dependencies != null ? String(row[colMap.dependencies] || '').trim() : ''

    tasks.push({
      id: `task-${Date.now()}-${i}`,
      name,
      start,
      end: end >= start ? end : start,
      progress,
      category,
      dependencies: deps, // resolved below
    })
  })

  // Resolve dependency references to task IDs.
  // Supports: row numbers (1-based), task names, or existing IDs.
  const idSet = new Set(tasks.map(t => t.id))
  tasks.forEach(task => {
    if (!task.dependencies) return
    const resolved = task.dependencies
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(ref => {
        // Already a valid ID in this import
        if (idSet.has(ref)) return ref
        // Row number (1-based)
        const n = parseInt(ref, 10)
        if (!isNaN(n) && n >= 1 && n <= tasks.length) return tasks[n - 1].id
        // Task name match (case-insensitive)
        const byName = tasks.find(t => t.name.toLowerCase() === ref.toLowerCase())
        if (byName) return byName.id
        return null
      })
      .filter(Boolean)
    task.dependencies = resolved.join(', ')
  })

  return tasks
}

// Parse 2D array of rows (first row = headers)
function parseTableData(rows) {
  if (!rows.length) return []
  const headers = rows[0].map(String)
  const colMap = {}

  headers.forEach((h, i) => {
    const key = matchColumn(h)
    if (key && colMap[key] == null) colMap[key] = i
  })

  // If no name column found, try first column
  if (colMap.name == null && headers.length > 0) colMap.name = 0
  // If no start found, try second column
  if (colMap.start == null && headers.length > 1) colMap.start = 1
  // If no end found, try third column
  if (colMap.end == null && headers.length > 2) colMap.end = 2

  const dataRows = rows.slice(1).map(r => r.map(c => (c == null ? '' : c)))
  return rowsToTasks(dataRows, colMap)
}

export function parseExcelFile(buffer) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  return parseTableData(rows)
}

export function parsePastedText(text) {
  if (!text.trim()) return []

  // Detect separator
  const firstLine = text.split('\n')[0]
  const sep = firstLine.includes('\t') ? '\t' : ','

  const rows = text
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')))

  // Check if first row looks like headers (no dates)
  const firstRow = rows[0]
  const looksLikeHeader = firstRow.some(c => matchColumn(c) !== null)

  if (!looksLikeHeader) {
    // Treat as headerless: name, start, end, [category]
    const syntheticHeader = ['Task Name', 'Start Date', 'End Date', 'Category', 'Progress', 'Dependencies']
    rows.unshift(syntheticHeader.slice(0, Math.max(firstRow.length, 3)))
  }

  return parseTableData(rows)
}

export function generateSampleData() {
  // 3-year grant starting from current month
  const base = new Date()
  base.setDate(1)
  const fmt = d => d.toISOString().substring(0, 10)
  const addM = (d, months) => {
    const r = new Date(d)
    r.setMonth(r.getMonth() + months)
    return r
  }

  return [
    // WP1: Establishing methods & resources
    { id: 'task-1', name: 'Systematic literature review',     start: fmt(base),           end: fmt(addM(base, 3)),  progress: 0, category: 'WP1', dependencies: '' },
    { id: 'task-2', name: 'Establish experimental protocols', start: fmt(addM(base, 1)),  end: fmt(addM(base, 6)),  progress: 0, category: 'WP1', dependencies: '' },
    { id: 'task-3', name: 'Recruit study cohort',             start: fmt(addM(base, 6)),  end: fmt(addM(base, 12)), progress: 0, category: 'WP1', dependencies: 'task-2' },
    // WP2: Data collection & generation  (each starts when its dependency ends)
    { id: 'task-4', name: 'Sample collection & processing',   start: fmt(addM(base, 12)), end: fmt(addM(base, 18)), progress: 0, category: 'WP2', dependencies: 'task-3' },
    { id: 'task-5', name: 'Genomic sequencing',               start: fmt(addM(base, 18)), end: fmt(addM(base, 21)), progress: 0, category: 'WP2', dependencies: 'task-4' },
    { id: 'task-6', name: 'Phenotypic characterisation',      start: fmt(addM(base, 18)), end: fmt(addM(base, 24)), progress: 0, category: 'WP2', dependencies: 'task-4' },
    // WP3: Analysis
    { id: 'task-7', name: 'Develop analysis pipeline',        start: fmt(addM(base, 6)),  end: fmt(addM(base, 15)), progress: 0, category: 'WP3', dependencies: '' },
    { id: 'task-8', name: 'Genome-wide association study',    start: fmt(addM(base, 21)), end: fmt(addM(base, 27)), progress: 0, category: 'WP3', dependencies: 'task-5,task-7' },
    { id: 'task-9', name: 'Functional validation experiments',start: fmt(addM(base, 27)), end: fmt(addM(base, 33)), progress: 0, category: 'WP3', dependencies: 'task-8' },
    // WP4: Dissemination
    { id: 'task-10', name: 'Conference presentations',        start: fmt(addM(base, 12)), end: fmt(addM(base, 36)), progress: 0, category: 'WP4', dependencies: '' },
    { id: 'task-11', name: 'Manuscript preparation',          start: fmt(addM(base, 27)), end: fmt(addM(base, 34)), progress: 0, category: 'WP4', dependencies: 'task-8' },
    { id: 'task-12', name: 'Submit papers & final report',    start: fmt(addM(base, 34)), end: fmt(addM(base, 36)), progress: 0, category: 'WP4', dependencies: 'task-11' },
  ]
}
