import { useRef, useCallback, useMemo, useState } from 'react'

// ── date helpers ──────────────────────────────────────────────────────────────
function parseDate(str) { return new Date(str + 'T00:00:00') }
function toStr(d) { return d instanceof Date ? d.toISOString().substring(0, 10) : String(d) }
function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000) }
function addDays(str, n) { const d = parseDate(str); d.setDate(d.getDate() + n); return toStr(d) }
function dateToX(dateStr, rangeStartStr, pxPerDay) {
  return daysBetween(rangeStartStr, dateStr) * pxPerDay
}

function floorToUnit(date, unit) {
  const d = new Date(date)
  if (unit === 'Month') { d.setDate(1); return d }
  if (unit === 'Quarter') { d.setDate(1); d.setMonth(Math.floor(d.getMonth() / 3) * 3); return d }
  d.setMonth(0); d.setDate(1); return d
}
function advanceUnit(date, unit) {
  const d = new Date(date)
  if (unit === 'Month') { d.setMonth(d.getMonth() + 1); return d }
  if (unit === 'Quarter') { d.setMonth(d.getMonth() + 3); return d }
  if (unit === 'Week') { d.setDate(d.getDate() + 7); return d }
  d.setFullYear(d.getFullYear() + 1); return d
}
function colLabel(date, unit) {
  if (unit === 'Week') return `${date.toLocaleString('default',{month:'short'})} ${date.getDate()}`
  if (unit === 'Month') return date.toLocaleString('default', { month: 'short', year: '2-digit' })
  if (unit === 'Quarter') return `Q${Math.floor(date.getMonth() / 3) + 1} '${String(date.getFullYear()).slice(2)}`
  return String(date.getFullYear())
}

function buildColumns(rangeStart, rangeEnd, unit) {
  const cols = []
  let cur = floorToUnit(new Date(rangeStart), unit)
  if (unit === 'Week') {
    cur.setDate(cur.getDate() - cur.getDay() + 1) // Monday
  }
  while (cur <= rangeEnd) {
    cols.push({ date: new Date(cur), label: colLabel(cur, unit) })
    cur = advanceUnit(cur, unit)
  }
  return cols
}

// ── constants ─────────────────────────────────────────────────────────────────
const COL_PX = { Week: 56, Month: 80, Quarter: 110, Year: 130 }
const ROW_H = 52
const BAR_H = 30
const BAR_Y = (ROW_H - BAR_H) / 2
const LABEL_W = 150
const HEADER_H = 44
const EDGE_PX = 14

const DEFAULT_COLORS = ['#6366f1','#0d9488','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

function isLight(hex) {
  const h = hex.replace('#','')
  const [r,g,b] = [0,2,4].map(i => parseInt(h.slice(i,i+2),16))
  return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.55
}

// ── component ─────────────────────────────────────────────────────────────────
export default function CustomGantt({ tasks, viewMode = 'Month', categoryColors = {}, onColorChange, onTaskChange, onTaskClick }) {
  const scrollRef = useRef(null)
  const dragRef = useRef(null)
  const [dragState, setDragState] = useState(null) // { taskId, dxDays }

  const colPx = COL_PX[viewMode] || 80

  const { rangeStartStr, columns, totalW, pxPerDay } = useMemo(() => {
    if (!tasks.length) return { rangeStartStr: toStr(new Date()), columns: [], totalW: 400, pxPerDay: 1 }

    const starts = tasks.map(t => parseDate(t.start))
    const ends   = tasks.map(t => parseDate(t.end))
    const minD = new Date(Math.min(...starts.map(d => d.getTime())))
    const maxD = new Date(Math.max(...ends.map(d => d.getTime())))

    const padStart = floorToUnit(new Date(minD), viewMode)
    const padEnd   = advanceUnit(floorToUnit(new Date(maxD), viewMode), viewMode)

    const cols = buildColumns(padStart, padEnd, viewMode)
    const rangeStartStr = toStr(padStart)
    const totalDays = daysBetween(rangeStartStr, toStr(padEnd)) || 1
    const totalW = Math.max(cols.length * colPx, 300)
    const pxPerDay = totalW / totalDays

    return { rangeStartStr, columns: cols, totalW, pxPerDay }
  }, [tasks, viewMode, colPx])

  const categories = useMemo(() => [...new Set(tasks.map(t => t.category).filter(Boolean))], [tasks])

  function getCatColor(cat) {
    const idx = categories.indexOf(cat)
    return (cat && categoryColors[cat]) || DEFAULT_COLORS[Math.max(0, idx) % DEFAULT_COLORS.length]
  }

  // ── touch drag ──────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e, task) => {
    const touch = e.touches[0]
    const rect  = e.currentTarget.getBoundingClientRect()
    const localX = touch.clientX - rect.left
    let type = 'move'
    if (localX <= EDGE_PX) type = 'resize-start'
    else if (localX >= rect.width - EDGE_PX) type = 'resize-end'

    dragRef.current = { taskId: task.id, type, startClientX: touch.clientX,
      origStart: task.start, origEnd: task.end, pxPerDay }
    setDragState({ taskId: task.id, dxDays: 0 })
    e.stopPropagation()
  }, [pxPerDay])

  const onTouchMove = useCallback((e) => {
    if (!dragRef.current) return
    const dxDays = Math.round((e.touches[0].clientX - dragRef.current.startClientX) / dragRef.current.pxPerDay)
    setDragState({ taskId: dragRef.current.taskId, dxDays })
    e.preventDefault()
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (!dragRef.current) return
    const { taskId, type, origStart, origEnd, startClientX, pxPerDay: ppd } = dragRef.current
    const dxDays = Math.round(((e.changedTouches[0]?.clientX ?? startClientX) - startClientX) / ppd)

    if (Math.abs(dxDays) < 1) {
      onTaskClick?.(taskId)
    } else {
      let newStart = origStart, newEnd = origEnd
      if (type === 'move') {
        newStart = addDays(origStart, dxDays)
        newEnd   = addDays(origEnd,   dxDays)
      } else if (type === 'resize-start') {
        newStart = addDays(origStart, dxDays)
        if (newStart >= newEnd) newStart = addDays(newEnd, -1)
      } else {
        newEnd = addDays(origEnd, dxDays)
        if (newEnd <= newStart) newEnd = addDays(newStart, 1)
      }
      onTaskChange?.(taskId, { start: newStart, end: newEnd })
    }

    dragRef.current = null
    setDragState(null)
  }, [onTaskClick, onTaskChange])

  if (!tasks.length) return <div style={{ padding: 24, color: 'var(--gx-text-muted)' }}>No tasks yet — use the + button to add one.</div>

  const todayStr = toStr(new Date())
  const todayX = dateToX(todayStr, rangeStartStr, pxPerDay)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none', minHeight: 0 }}>
      {/* Legend */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--gx-border)', flexShrink: 0, alignItems: 'center' }}>
          {categories.map(cat => {
            const fill = getCatColor(cat)
            return (
              <label key={cat} title="Click to change colour" style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, color: 'var(--gx-text-muted)' }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: fill, flexShrink: 0, display: 'inline-block' }} />
                <input type="color" value={fill} onChange={e => onColorChange?.(cat, e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
                {cat}
              </label>
            )
          })}
          <span style={{ fontSize: 11, color: 'var(--gx-text-muted)', opacity: 0.5 }}>tap label to change colour</span>
        </div>
      )}

      {/* Chart */}
      <div
        ref={scrollRef}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'auto', minHeight: 0 }}
      >
        {/* Sticky label column */}
        <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 3, background: 'var(--gx-surface)', borderRight: '2px solid var(--gx-border)' }}>
          <div style={{ height: HEADER_H, display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 11, fontWeight: 700, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--gx-border)' }}>
            Task
          </div>
          {tasks.map((task, i) => (
            <div key={task.id} onClick={() => onTaskClick?.(task.id)}
              style={{ height: ROW_H, display: 'flex', alignItems: 'center', paddingLeft: 10, paddingRight: 6, borderBottom: '1px solid var(--gx-border)', fontSize: 12, fontWeight: 500, color: 'var(--gx-text)', cursor: 'pointer', overflow: 'hidden', background: i % 2 === 0 ? 'transparent' : 'var(--gx-bg-alt)' }}
              title={task.name}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: getCatColor(task.category), flexShrink: 0, marginRight: 6 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</span>
            </div>
          ))}
        </div>

        {/* Scrollable chart area */}
        <div style={{ position: 'relative', minWidth: totalW, flexShrink: 0 }}>
          {/* Column headers */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2, background: 'var(--gx-surface)', height: HEADER_H, borderBottom: '2px solid var(--gx-border)' }}>
            {columns.map((col, i) => (
              <div key={i} style={{ width: colPx, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--gx-text-muted)', borderRight: '1px solid var(--gx-border)' }}>
                {col.label}
              </div>
            ))}
          </div>

          {/* Rows + bars */}
          <div style={{ position: 'relative', width: totalW, height: tasks.length * ROW_H }}>
            {/* Grid lines */}
            {columns.map((_, i) => (
              <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * colPx, width: 1, background: 'var(--gx-border)' }} />
            ))}
            {/* Row stripes */}
            {tasks.map((_, i) => (
              <div key={i} style={{ position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H, borderBottom: '1px solid var(--gx-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gx-bg-alt)' }} />
            ))}
            {/* Today line */}
            {todayX > 0 && todayX < totalW && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayX, width: 2, background: 'var(--gx-accent)', opacity: 0.5, zIndex: 1, pointerEvents: 'none' }} />
            )}
            {/* Bars */}
            {tasks.map((task, rowIdx) => {
              const isDragging = dragState?.taskId === task.id
              let s = task.start, e = task.end
              if (isDragging && dragRef.current) {
                const { type, origStart, origEnd, dxDays: _ } = dragRef.current
                const d = dragState.dxDays
                if (type === 'move')          { s = addDays(origStart, d); e = addDays(origEnd, d) }
                else if (type === 'resize-start') { s = addDays(origStart, d); if (s >= e) s = addDays(e, -1) }
                else                          { e = addDays(origEnd,   d); if (e <= s) e = addDays(s, 1) }
              }
              const x = dateToX(s, rangeStartStr, pxPerDay)
              const w = Math.max(14, dateToX(e, rangeStartStr, pxPerDay) - x)
              const fill = getCatColor(task.category)
              const textCol = isLight(fill) ? '#1a1a1a' : '#fff'
              const progressW = w * ((task.progress ?? 0) / 100)

              return (
                <div key={task.id}
                  onTouchStart={ev => onTouchStart(ev, task)}
                  onClick={() => onTaskClick?.(task.id)}
                  style={{
                    position: 'absolute', left: x, top: rowIdx * ROW_H + BAR_Y, width: w, height: BAR_H,
                    borderRadius: 4, background: fill, cursor: isDragging ? 'grabbing' : 'grab',
                    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.25)' : '0 1px 2px rgba(0,0,0,0.12)',
                    zIndex: isDragging ? 10 : 1, touchAction: 'none',
                    display: 'flex', alignItems: 'center', overflow: 'hidden',
                  }}
                >
                  {progressW > 0 && <div style={{ position: 'absolute', top: 0, left: 0, width: progressW, height: '100%', background: 'rgba(0,0,0,0.18)', borderRadius: '4px 0 0 4px' }} />}
                  <div style={{ width: EDGE_PX, height: '100%', flexShrink: 0, cursor: 'ew-resize' }} />
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: textCol, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', pointerEvents: 'none' }}>
                    {w > 40 ? task.name : ''}
                  </span>
                  <div style={{ width: EDGE_PX, height: '100%', flexShrink: 0, cursor: 'ew-resize' }} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
