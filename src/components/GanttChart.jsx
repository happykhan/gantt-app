import { useEffect, useRef, useCallback } from 'react'
import Gantt from 'frappe-gantt'
import '../frappe-gantt.css'

const DEFAULT_COLORS = [
  '#6366f1','#0d9488','#10b981','#f59e0b',
  '#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16',
]

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

function isLight(hex) {
  const [r,g,b] = hexToRgb(hex)
  return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.55
}

function darken(hex, amount = 0.22) {
  const d = 1 - amount
  return '#' + hexToRgb(hex).map(c => Math.round(c*d).toString(16).padStart(2,'0')).join('')
}

const QUARTER_MODE = {
  name: 'Quarter',
  padding: '3m',
  step: '3m',
  column_width: 120,
  date_format: 'YYYY-MM',
  lower_text: (d) => `Q${Math.floor(d.getMonth()/3)+1} ${d.getFullYear()}`,
  upper_text: (d, ld) => !ld || d.getFullYear() !== ld.getFullYear() ? String(d.getFullYear()) : '',
  thick_line: (d) => d.getMonth() === 0,
  snap_at: '7d',
}

const VIEW_MODES = ['Week', 'Month', QUARTER_MODE, 'Year']

export default function GanttChart({ tasks, viewMode, onTaskChange, onTaskClick, categoryColors = {}, onColorChange }) {
  const containerRef = useRef(null)
  const ganttRef = useRef(null)

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]

  function catColor(cat, idx) {
    return categoryColors[cat] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
  }

  function buildStyles() {
    return categories.map((cat, i) => {
      const fill = catColor(cat, i)
      return `
        .gantt .bar-wrapper.bar-cat-${i} .bar { fill: ${fill}; }
        .gantt .bar-wrapper.bar-cat-${i} .bar-progress { fill: ${darken(fill)}; }
        .gantt .bar-wrapper.bar-cat-${i} .bar-label { fill: ${isLight(fill) ? '#1a1a1a' : '#ffffff'}; }
      `
    }).join('\n')
  }

  const toGanttTasks = useCallback((taskList) => {
    const cats = [...new Set(taskList.map(t => t.category).filter(Boolean))]
    return taskList.map(t => ({
      id: t.id,
      name: t.name,
      start: t.start,
      end: t.end,
      progress: t.progress ?? 0,
      dependencies: t.dependencies || '',
      custom_class: cats.indexOf(t.category) >= 0 ? `bar-cat-${cats.indexOf(t.category)}` : '',
    }))
  }, [])

  function resolveMode(name) {
    return name === 'Quarter' ? QUARTER_MODE : name
  }

  // Init chart
  useEffect(() => {
    if (!containerRef.current || !tasks.length) return
    containerRef.current.innerHTML = ''
    ganttRef.current = new Gantt(containerRef.current, toGanttTasks(tasks), {
      view_modes: VIEW_MODES,
      view_mode: resolveMode(viewMode || 'Month'),
      scroll_to: 'start',
      bar_height: 32,
      bar_corner_radius: 4,
      padding: 14,
      on_date_change(task, start, end) {
        onTaskChange(task.id, {
          start: start.toISOString().substring(0, 10),
          end: end.toISOString().substring(0, 10),
        })
      },
      on_progress_change(task, progress) { onTaskChange(task.id, { progress }) },
      on_click(task) { onTaskClick(task.id) },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length > 0 ? tasks[0].id : null])

  // Refresh data
  useEffect(() => {
    if (!ganttRef.current || !tasks.length) return
    try { ganttRef.current.refresh(toGanttTasks(tasks)) } catch { /* ignore */ }
  }, [tasks, toGanttTasks])

  // Change view mode
  useEffect(() => {
    if (!ganttRef.current || !viewMode) return
    try { ganttRef.current.change_view_mode(resolveMode(viewMode)) } catch { /* ignore */ }
  }, [viewMode])

  if (!tasks.length) return null

  return (
    <div>
      <style>{buildStyles()}</style>

      {/* Legend — click dot (or name) to open colour picker */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          {categories.map((cat, i) => {
            const fill = catColor(cat, i)
            return (
              <label
                key={cat}
                title={`Click to change colour for ${cat}`}
                style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: 'var(--gx-text-muted)', userSelect: 'none' }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 3, background: fill,
                  display: 'inline-block', flexShrink: 0,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
                }} />
                {/* hidden native colour picker — label click opens it */}
                <input
                  type="color"
                  value={fill}
                  onChange={e => onColorChange(cat, e.target.value)}
                  style={{ width: 0, height: 0, padding: 0, border: 'none', opacity: 0, position: 'absolute' }}
                />
                {cat}
              </label>
            )
          })}
          <span style={{ fontSize: 11, color: 'var(--gx-text-muted)', opacity: 0.55 }}>tap to change colour</span>
        </div>
      )}

      <div ref={containerRef} className="gantt-container" style={{ width: '100%' }} />
    </div>
  )
}
