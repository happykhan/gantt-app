import { useEffect, useRef, useCallback } from 'react'
import Gantt from 'frappe-gantt'
import '../frappe-gantt.css'

const CAT_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

function getCategoryIndex(task, categories) {
  if (!task.category) return -1
  return categories.indexOf(task.category)
}

export default function GanttChart({ tasks, viewMode, onTaskChange, onTaskClick, selectedId }) {
  const containerRef = useRef(null)
  const ganttRef = useRef(null)

  // Collect unique categories (stable order)
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

  // Init on first render
  useEffect(() => {
    if (!containerRef.current || !tasks.length) return

    // Clear previous instance
    containerRef.current.innerHTML = ''

    const ganttTasks = toGanttTasks(tasks)

    ganttRef.current = new Gantt(containerRef.current, ganttTasks, {
      view_mode: viewMode || 'Week',
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
  }, [tasks.length > 0 ? tasks[0].id : null]) // only reinit when task set changes structurally

  // Refresh when task data changes
  useEffect(() => {
    if (!ganttRef.current || !tasks.length) return
    try {
      ganttRef.current.refresh(toGanttTasks(tasks))
    } catch {
      // ignore refresh errors — will reinit on next mount
    }
  }, [tasks, toGanttTasks])

  // Change view mode
  useEffect(() => {
    if (!ganttRef.current || !viewMode) return
    ganttRef.current.change_view_mode(viewMode)
  }, [viewMode])

  if (!tasks.length) return null

  return (
    <div>
      {/* Category legend */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {categories.map((cat, i) => (
            <span key={cat} className="flex items-center gap-1.5 text-sm text-gray-600">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
              />
              {cat}
            </span>
          ))}
        </div>
      )}
      <div ref={containerRef} className="gantt-container w-full" />
    </div>
  )
}
