const DAY = 86_400_000

function dateValue(value) {
  const parsed = new Date(`${value}T00:00:00`).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

export function getProjectSpanDays(tasks) {
  const starts = tasks.map(task => dateValue(task.start)).filter(value => value !== null)
  const ends = tasks.map(task => dateValue(task.end)).filter(value => value !== null)
  if (!starts.length || !ends.length) return 0
  return Math.max(1, Math.round((Math.max(...ends) - Math.min(...starts)) / DAY))
}

export function chooseResponsiveViewMode(tasks, viewportWidth) {
  const days = getProjectSpanDays(tasks)
  const compact = viewportWidth < 600
  const tablet = viewportWidth < 1024

  if (!days) return compact ? 'Month' : 'Quarter'
  if (days <= 84) return compact ? 'Month' : 'Week'
  if (days <= 365) return compact ? 'Quarter' : 'Month'
  if (days <= 1_095) return tablet ? 'Quarter' : 'Month'
  return 'Year'
}

export function clampZoom(value, min = 0.4, max = 2) {
  return Math.min(max, Math.max(min, Number(value.toFixed(2))))
}
