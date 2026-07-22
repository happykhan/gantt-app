export const COLUMN_WIDTHS = { Week: 56, Month: 80, Quarter: 110, Year: 130 }

export function parseDate(value) {
  return new Date(`${value}T00:00:00`)
}

export function formatDate(date) {
  if (!(date instanceof Date)) return String(date)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function daysBetween(start, end) {
  return Math.round((parseDate(end) - parseDate(start)) / 86400000)
}

export function addDays(value, days) {
  const date = parseDate(value)
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

export function dateToX(value, rangeStart, pixelsPerDay) {
  return daysBetween(rangeStart, value) * pixelsPerDay
}

export function floorToUnit(date, unit) {
  const result = new Date(date)
  if (unit === 'Month') { result.setDate(1); return result }
  if (unit === 'Quarter') {
    result.setDate(1)
    result.setMonth(Math.floor(result.getMonth() / 3) * 3)
    return result
  }
  if (unit === 'Week') {
    const day = result.getDay()
    result.setDate(result.getDate() - (day === 0 ? 6 : day - 1))
    return result
  }
  result.setMonth(0)
  result.setDate(1)
  return result
}

export function advanceUnit(date, unit) {
  const result = new Date(date)
  if (unit === 'Month') result.setMonth(result.getMonth() + 1)
  else if (unit === 'Quarter') result.setMonth(result.getMonth() + 3)
  else if (unit === 'Week') result.setDate(result.getDate() + 7)
  else result.setFullYear(result.getFullYear() + 1)
  return result
}

export function columnLabel(date, unit) {
  if (unit === 'Week') return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`
  if (unit === 'Month') return date.toLocaleString('default', { month: 'short', year: '2-digit' })
  if (unit === 'Quarter') return `Q${Math.floor(date.getMonth() / 3) + 1} '${String(date.getFullYear()).slice(2)}`
  return String(date.getFullYear())
}

export function buildColumns(rangeStart, rangeEnd, unit) {
  const columns = []
  let current = floorToUnit(new Date(rangeStart), unit)
  while (current <= rangeEnd) {
    columns.push({ date: new Date(current), label: columnLabel(current, unit) })
    current = advanceUnit(current, unit)
  }
  return columns
}

export function buildTimelineGeometry(tasks, viewMode = 'Month', availableWidth = 0) {
  const baseColumnWidth = COLUMN_WIDTHS[viewMode] || COLUMN_WIDTHS.Month
  if (!tasks.length) {
    return {
      rangeStart: formatDate(new Date()),
      columns: [],
      totalWidth: Math.max(400, availableWidth),
      pixelsPerDay: 1,
      columnWidth: baseColumnWidth,
    }
  }

  const starts = tasks.map(task => parseDate(task.start).getTime())
  const ends = tasks.map(task => parseDate(task.end).getTime())
  const paddedStart = floorToUnit(new Date(Math.min(...starts)), viewMode)
  const paddedEnd = advanceUnit(floorToUnit(new Date(Math.max(...ends)), viewMode), viewMode)
  const columns = buildColumns(paddedStart, paddedEnd, viewMode)
  const rangeStart = formatDate(paddedStart)
  const totalDays = daysBetween(rangeStart, formatDate(paddedEnd)) || 1
  const columnWidth = Math.max(baseColumnWidth, availableWidth > 0 ? availableWidth / Math.max(columns.length, 1) : 0)
  const totalWidth = Math.max(columns.length * columnWidth, 300, availableWidth)

  return {
    rangeStart,
    columns,
    totalWidth,
    pixelsPerDay: totalWidth / totalDays,
    columnWidth,
  }
}

export function taskDatesDuringDrag(task, dragState) {
  if (dragState?.taskId !== task.id) return { start: task.start, end: task.end }
  const { type, origStart, origEnd, dxDays } = dragState
  if (type === 'move') return { start: addDays(origStart, dxDays), end: addDays(origEnd, dxDays) }
  if (type === 'resize-start') {
    const start = addDays(origStart, dxDays)
    return { start: start >= origEnd ? addDays(origEnd, -1) : start, end: origEnd }
  }
  const end = addDays(origEnd, dxDays)
  return { start: origStart, end: end <= origStart ? addDays(origStart, 1) : end }
}

export function buildDependencyPaths(tasks, rangeStart, pixelsPerDay, rowHeight, dragState) {
  const taskIndex = new Map(tasks.map((task, index) => [task.id, index]))
  const paths = []

  tasks.forEach((task, destinationIndex) => {
    if (!task.dependencies) return
    const destinationDates = taskDatesDuringDrag(task, dragState)
    task.dependencies.split(',').map(value => value.trim()).filter(Boolean).forEach(dependencyId => {
      const sourceIndex = taskIndex.get(dependencyId)
      if (sourceIndex === undefined) return
      const sourceDates = taskDatesDuringDrag(tasks[sourceIndex], dragState)
      const sourceX = dateToX(sourceDates.end, rangeStart, pixelsPerDay)
      const sourceY = sourceIndex * rowHeight + rowHeight / 2
      const destinationX = dateToX(destinationDates.start, rangeStart, pixelsPerDay)
      const destinationY = destinationIndex * rowHeight + rowHeight / 2
      let path

      if (destinationX >= sourceX) {
        const elbow = Math.min(18, Math.max(2, (destinationX - sourceX) / 2))
        path = `M${sourceX},${sourceY} H${sourceX + elbow} V${destinationY} H${destinationX}`
      } else {
        const approach = Math.max(2, destinationX - 10)
        const seam = destinationIndex > sourceIndex
          ? sourceIndex * rowHeight + rowHeight - 1
          : (destinationIndex + 1) * rowHeight + 1
        path = `M${sourceX},${sourceY} H${sourceX + 6} V${seam} H${approach} V${destinationY} H${destinationX}`
      }
      paths.push({ key: `${dependencyId}-${task.id}`, path })
    })
  })

  return paths
}

export function isLightColour(hex) {
  const value = hex.replace('#', '')
  const [red, green, blue] = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16))
  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255 > 0.55
}
