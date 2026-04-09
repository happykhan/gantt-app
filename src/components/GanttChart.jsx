import { useEffect, useRef, useCallback } from 'react'
import Gantt from 'frappe-gantt'
import '../frappe-gantt.css'

const CAT_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

// Custom Quarter view mode (not built into frappe-gantt)
const QUARTER_MODE = {
  name: 'Quarter',
  padding: '3m',
  step: '3m',
  column_width: 120,
  date_format: 'YYYY-MM',
  lower_text: (d) => `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`,
  upper_text: (d, ld) =>
    !ld || d.getFullYear() !== ld.getFullYear() ? String(d.getFullYear()) : '',
  thick_line: (d) => d.getMonth() === 0,
  snap_at: '7d',
}

// Built-in modes we expose
const VIEW_MODES = ['Week', 'Month', QUARTER_MODE, 'Year']

export default function GanttChart({ tasks, viewMode, onTaskChange, onTaskClick }) {
  const containerRef = useRef(null)
  const ganttRef = useRef(null)

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]

  const toGanttTasks = useCallback((taskList) => {
    const cats = [...new Set(taskList.map(t => t.category).filter(Boolean))]
    return taskList.map(t => {
      const catIdx = cats.indexOf(t.category)
      return {
        id: t.id,
        name: t.name,
        start: t.start,
        end: t.end,
        progress: t.progress ?? 0,
        dependencies: t.dependencies || '',
        custom_class: catIdx >= 0 ? `bar-cat-${catIdx % 10}` : '',
      }
    })
  }, [])

  function resolveMode(name) {
    if (name === 'Quarter') return QUARTER_MODE
    return name
  }

  // Init on first render / when task structure changes
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
      on_progress_change(task, progress) {
        onTaskChange(task.id, { progress })
      },
      on_click(task) {
        onTaskClick(task.id)
      },
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
      {categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
          {categories.map((cat, i) => (
            <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gx-text-muted)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: CAT_COLORS[i % CAT_COLORS.length], display: 'inline-block' }} />
              {cat}
            </span>
          ))}
        </div>
      )}
      <div ref={containerRef} className="gantt-container" style={{ width: '100%' }} />
    </div>
  )
}
