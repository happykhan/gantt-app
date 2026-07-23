const DAY_MS = 86_400_000

const COLUMN_WIDTH = { Week: 56, Month: 80, Quarter: 110, Year: 130 }
const DEFAULT_COLOURS = ['#0d9488', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#f97316', '#6366f1', '#ec4899', '#14b8a6', '#84cc16']

export const EXPORT_THEME = {
  light: {
    background: '#f8fafc', alternate: '#f1f5f9', surface: '#ffffff',
    text: '#0f172a', muted: '#64748b', border: '#cbd5e1', accent: '#0d9488',
  },
  dark: {
    background: '#0f172a', alternate: '#1e293b', surface: '#111827',
    text: '#f8fafc', muted: '#94a3b8', border: '#475569', accent: '#2dd4bf',
  },
}

function parseDate(value) {
  return new Date(`${value}T00:00:00Z`)
}

function dateString(date) {
  return date.toISOString().slice(0, 10)
}

function daysBetween(start, end) {
  return Math.round((parseDate(end) - parseDate(start)) / DAY_MS)
}

function floorToUnit(date, unit) {
  const result = new Date(date)
  if (unit === 'Week') {
    const day = result.getUTCDay()
    result.setUTCDate(result.getUTCDate() - (day === 0 ? 6 : day - 1))
  } else if (unit === 'Month') {
    result.setUTCDate(1)
  } else if (unit === 'Quarter') {
    result.setUTCDate(1)
    result.setUTCMonth(Math.floor(result.getUTCMonth() / 3) * 3)
  } else {
    result.setUTCMonth(0, 1)
  }
  return result
}

function advanceUnit(date, unit) {
  const result = new Date(date)
  if (unit === 'Week') result.setUTCDate(result.getUTCDate() + 7)
  else if (unit === 'Month') result.setUTCMonth(result.getUTCMonth() + 1)
  else if (unit === 'Quarter') result.setUTCMonth(result.getUTCMonth() + 3)
  else result.setUTCFullYear(result.getUTCFullYear() + 1)
  return result
}

function columnLabel(date, unit) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (unit === 'Week') return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`
  if (unit === 'Month') return `${months[date.getUTCMonth()]} '${String(date.getUTCFullYear()).slice(2)}`
  if (unit === 'Quarter') return `Q${Math.floor(date.getUTCMonth() / 3) + 1} '${String(date.getUTCFullYear()).slice(2)}`
  return String(date.getUTCFullYear())
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function readableText(hex) {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return '#ffffff'
  const [r, g, b] = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16))
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.58 ? '#111827' : '#ffffff'
}

export function getProjectDateRange(tasks) {
  const valid = tasks.filter(task => /^\d{4}-\d{2}-\d{2}$/.test(task.start) && /^\d{4}-\d{2}-\d{2}$/.test(task.end))
  if (!valid.length) return { start: 'undated', end: 'undated' }
  return {
    start: valid.reduce((min, task) => task.start < min ? task.start : min, valid[0].start),
    end: valid.reduce((max, task) => task.end > max ? task.end : max, valid[0].end),
  }
}

export function exportFilename(title, tasks, extension) {
  const stem = String(title || 'gantt-project')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'gantt-project'
  const { start, end } = getProjectDateRange(tasks)
  return `${stem}_${start}_to_${end}.${extension}`
}

export function readExportTheme() {
  if (typeof document === 'undefined') return EXPORT_THEME.light
  const styles = getComputedStyle(document.documentElement)
  const fallback = document.documentElement.dataset.theme === 'dark' ? EXPORT_THEME.dark : EXPORT_THEME.light
  const variable = (name, value) => styles.getPropertyValue(name).trim() || value
  return {
    background: variable('--gx-bg', fallback.background),
    alternate: variable('--gx-bg-alt', fallback.alternate),
    surface: variable('--gx-surface', fallback.surface),
    text: variable('--gx-text', fallback.text),
    muted: variable('--gx-text-muted', fallback.muted),
    border: variable('--gx-border', fallback.border),
    accent: variable('--gx-accent', fallback.accent),
  }
}

export function renderChartSvg({
  tasks,
  title = '',
  viewMode = 'Month',
  rowHeight = 52,
  fontSize = 11,
  fontFamily = 'system-ui, sans-serif',
  categoryColors = {},
  theme = EXPORT_THEME.light,
}) {
  if (!tasks.length) throw new Error('Add at least one task before exporting.')

  const { start, end } = getProjectDateRange(tasks)
  const invalidTask = tasks.find(task => !/^\d{4}-\d{2}-\d{2}$/.test(task.start) || !/^\d{4}-\d{2}-\d{2}$/.test(task.end))
  if (invalidTask) throw new Error(`“${invalidTask.name || 'Untitled task'}” needs valid start and end dates before exporting.`)
  const unit = COLUMN_WIDTH[viewMode] ? viewMode : 'Month'
  const rangeStart = floorToUnit(parseDate(start), unit)
  const rangeEnd = advanceUnit(floorToUnit(parseDate(end), unit), unit)
  const rangeStartString = dateString(rangeStart)
  const totalDays = Math.max(1, daysBetween(rangeStartString, dateString(rangeEnd)))
  const columns = []
  for (let current = rangeStart; current < rangeEnd; current = advanceUnit(current, unit)) {
    columns.push({ date: new Date(current), label: columnLabel(current, unit) })
  }

  const minimumColumnWidth = COLUMN_WIDTH[unit]
  const longestName = tasks.reduce((length, task) => Math.max(length, String(task.name || '').length), 0)
  const labelWidth = Math.max(180, Math.min(420, Math.ceil(longestName * (fontSize + 1) * 0.62 + 28)))
  const titleHeight = title ? 58 : 34
  const headerHeight = 44
  const legendCategories = [...new Set(tasks.map(task => task.category).filter(Boolean))]
  const legendItemWidth = Math.max(120, legendCategories.reduce((longest, category) => Math.max(longest, String(category).length * 7 + 36), 0))
  const minimumWidth = labelWidth + Math.max(columns.length * minimumColumnWidth, 300)
  const titleWidth = title ? title.length * 11 + 36 : 0
  const width = Math.max(minimumWidth, titleWidth, legendItemWidth + 24)
  const timelineWidth = width - labelWidth
  const columnWidth = timelineWidth / columns.length
  const pixelsPerDay = timelineWidth / totalDays
  const legendColumns = Math.max(1, Math.floor((width - 24) / legendItemWidth))
  const legendHeight = legendCategories.length ? Math.ceil(legendCategories.length / legendColumns) * 28 + 8 : 0
  const height = titleHeight + headerHeight + tasks.length * rowHeight + legendHeight
  const barHeight = Math.max(16, Math.round(rowHeight * 0.58))
  const barOffset = Math.round((rowHeight - barHeight) / 2)
  const categories = new Map(legendCategories.map((category, index) => [category, categoryColors[category] || DEFAULT_COLOURS[index % DEFAULT_COLOURS.length]]))
  const taskById = new Map(tasks.map((task, index) => [task.id, { task, index }]))
  const xForDate = date => labelWidth + daysBetween(rangeStartString, date) * pixelsPerDay
  const lines = []
  const add = value => lines.push(value)

  add('<?xml version="1.0" encoding="UTF-8"?>')
  add(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-description">`)
  add(`<title id="chart-title">${escapeXml(title || 'Gantt project')}</title>`)
  add(`<desc id="chart-description">Gantt chart from ${start} to ${end} with ${tasks.length} tasks.</desc>`)
  add('<defs><marker id="dependency-end" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#64748b"/></marker></defs>')
  add(`<rect width="${width}" height="${height}" fill="${escapeXml(theme.background)}"/>`)

  if (title) {
    add(`<rect width="${width}" height="${titleHeight}" fill="${escapeXml(theme.surface)}"/>`)
    add(`<text x="18" y="25" font-family="${escapeXml(fontFamily)}" font-size="18" font-weight="700" fill="${escapeXml(theme.text)}">${escapeXml(title)}</text>`)
    add(`<text x="18" y="45" font-family="${escapeXml(fontFamily)}" font-size="11" fill="${escapeXml(theme.muted)}">${start} to ${end}</text>`)
  } else {
    add(`<rect width="${width}" height="${titleHeight}" fill="${escapeXml(theme.surface)}"/>`)
    add(`<text x="18" y="23" font-family="${escapeXml(fontFamily)}" font-size="12" fill="${escapeXml(theme.muted)}">${start} to ${end}</text>`)
  }

  const headerY = titleHeight
  add(`<rect y="${headerY}" width="${width}" height="${headerHeight}" fill="${escapeXml(theme.surface)}"/>`)
  add(`<line x1="0" y1="${headerY + headerHeight}" x2="${width}" y2="${headerY + headerHeight}" stroke="${escapeXml(theme.border)}" stroke-width="2"/>`)
  add(`<line x1="${labelWidth}" y1="${headerY}" x2="${labelWidth}" y2="${height - legendHeight}" stroke="${escapeXml(theme.border)}" stroke-width="2"/>`)
  add(`<text x="12" y="${headerY + 27}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" font-weight="700" fill="${escapeXml(theme.muted)}">TASK</text>`)

  columns.forEach((column, index) => {
    const x = labelWidth + index * columnWidth
    add(`<line x1="${x}" y1="${headerY}" x2="${x}" y2="${height - legendHeight}" stroke="${escapeXml(theme.border)}"/>`)
    add(`<text x="${x + columnWidth / 2}" y="${headerY + 27}" text-anchor="middle" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" font-weight="600" fill="${escapeXml(theme.muted)}">${escapeXml(column.label)}</text>`)
  })
  add(`<line x1="${width - 0.5}" y1="${headerY}" x2="${width - 0.5}" y2="${height - legendHeight}" stroke="${escapeXml(theme.border)}"/>`)

  const rowsY = titleHeight + headerHeight
  tasks.forEach((task, index) => {
    const y = rowsY + index * rowHeight
    const fill = index % 2 ? theme.alternate : theme.background
    add(`<rect x="0" y="${y}" width="${width}" height="${rowHeight}" fill="${escapeXml(fill)}"/>`)
    add(`<line x1="0" y1="${y + rowHeight}" x2="${width}" y2="${y + rowHeight}" stroke="${escapeXml(theme.border)}"/>`)
    const milestone = task.start === task.end ? '◆ ' : ''
    add(`<text x="12" y="${y + rowHeight / 2 + (fontSize + 1) * 0.35}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize + 1}" fill="${escapeXml(theme.text)}">${escapeXml(milestone + task.name)}</text>`)
  })

  tasks.forEach((task, toIndex) => {
    String(task.dependencies || '').split(',').map(value => value.trim()).filter(Boolean).forEach(dependencyId => {
      const dependency = taskById.get(dependencyId)
      if (!dependency) return
      const x1 = xForDate(dependency.task.end)
      const y1 = rowsY + dependency.index * rowHeight + rowHeight / 2
      const x2 = xForDate(task.start)
      const y2 = rowsY + toIndex * rowHeight + rowHeight / 2
      const bend = x2 >= x1 ? Math.min(18, Math.max(5, (x2 - x1) / 2)) : 10
      const approach = Math.max(labelWidth + 4, x2 - 10)
      const path = x2 >= x1
        ? `M${x1},${y1} H${x1 + bend} V${y2} H${x2 - 2}`
        : `M${x1},${y1} H${x1 + 8} V${y1 + (toIndex > dependency.index ? rowHeight / 2 - 2 : -rowHeight / 2 + 2)} H${approach} V${y2} H${x2 - 2}`
      add(`<path d="${path}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 2" marker-end="url(#dependency-end)"/>`)
    })
  })

  tasks.forEach((task, index) => {
    const centreY = rowsY + index * rowHeight + rowHeight / 2
    const x = xForDate(task.start)
    const colour = task.color || categories.get(task.category) || DEFAULT_COLOURS[0]
    if (task.start === task.end) {
      const half = barHeight / 2
      add(`<path d="M${x},${centreY - half} L${x + half},${centreY} L${x},${centreY + half} L${x - half},${centreY} Z" fill="${escapeXml(colour)}"/>`)
      return
    }
    const taskWidth = Math.max(14, xForDate(task.end) - x)
    const progressWidth = taskWidth * Math.min(100, Math.max(0, Number(task.progress) || 0)) / 100
    const y = rowsY + index * rowHeight + barOffset
    add(`<rect x="${x}" y="${y}" width="${taskWidth}" height="${barHeight}" rx="4" fill="${escapeXml(colour)}"/>`)
    if (progressWidth > 0) add(`<rect x="${x}" y="${y}" width="${progressWidth}" height="${barHeight}" rx="4" fill="#000000" opacity="0.25"/>`)
    if (taskWidth > 44) {
      add(`<text x="${x + taskWidth / 2}" y="${centreY + fontSize * 0.35}" text-anchor="middle" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" font-weight="600" fill="${readableText(colour)}">${escapeXml(task.name)}</text>`)
    }
  })

  if (legendCategories.length) {
    const legendY = height - legendHeight
    add(`<rect x="0" y="${legendY}" width="${width}" height="${legendHeight}" fill="${escapeXml(theme.surface)}"/>`)
    add(`<line x1="0" y1="${legendY}" x2="${width}" y2="${legendY}" stroke="${escapeXml(theme.border)}"/>`)
    legendCategories.forEach((category, index) => {
      const column = index % legendColumns
      const row = Math.floor(index / legendColumns)
      const x = 12 + column * legendItemWidth
      const y = legendY + 20 + row * 28
      add(`<rect x="${x}" y="${y - 10}" width="11" height="11" rx="2" fill="${escapeXml(categories.get(category))}"/>`)
      add(`<text x="${x + 17}" y="${y}" font-family="${escapeXml(fontFamily)}" font-size="11" fill="${escapeXml(theme.muted)}">${escapeXml(category)}</text>`)
    })
  }

  add('</svg>')
  return { svg: lines.join('\n'), width, height }
}
