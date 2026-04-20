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
export default function CustomGantt({ tasks, viewMode = 'Month', categoryColors = {}, onColorChange, onTaskChange, onTaskClick, onRenameCategory, exportRef, scrollExportRef }) {
  const scrollRef = useRef(null)
  const dragRef = useRef(null)
  const [dragState, setDragState] = useState(null) // { taskId, dxDays }
  const [editingCat, setEditingCat] = useState(null) // category name being renamed

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

  // ── shared drag commit ───────────────────────────────────────────────────────
  const TAP_THRESHOLD_PX = 8

  function commitDrag(clientX) {
    if (!dragRef.current) return
    const { taskId, type, origStart, origEnd, startClientX, pxPerDay: ppd } = dragRef.current
    const dxPx = clientX - startClientX
    if (Math.abs(dxPx) < TAP_THRESHOLD_PX) {
      onTaskClick?.(taskId)
    } else {
      const dxDays = Math.round(dxPx / ppd)
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
  }

  function initDrag(clientX, rect, task) {
    const localX = clientX - rect.left
    let type = 'move'
    if (localX <= EDGE_PX) type = 'resize-start'
    else if (localX >= rect.width - EDGE_PX) type = 'resize-end'
    dragRef.current = { taskId: task.id, type, startClientX: clientX,
      origStart: task.start, origEnd: task.end, pxPerDay }
    setDragState({ taskId: task.id, dxDays: 0 })
  }

  // ── touch drag ──────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e, task) => {
    const touch = e.touches[0]
    initDrag(touch.clientX, e.currentTarget.getBoundingClientRect(), task)
    e.stopPropagation()
  }, [pxPerDay])  // eslint-disable-line react-hooks/exhaustive-deps

  const onTouchMove = useCallback((e) => {
    if (!dragRef.current) return
    const dxDays = Math.round((e.touches[0].clientX - dragRef.current.startClientX) / dragRef.current.pxPerDay)
    setDragState({ taskId: dragRef.current.taskId, dxDays })
    e.preventDefault()
  }, [])

  const onTouchEnd = useCallback((e) => {
    e.preventDefault() // prevent synthetic mouse/click events after touch
    commitDrag(e.changedTouches[0]?.clientX ?? dragRef.current?.startClientX ?? 0)
  }, [onTaskClick, onTaskChange])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── mouse drag ───────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e, task) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    initDrag(e.clientX, e.currentTarget.getBoundingClientRect(), task)

    function onMouseMove(ev) {
      if (!dragRef.current) return
      const dxDays = Math.round((ev.clientX - dragRef.current.startClientX) / dragRef.current.pxPerDay)
      setDragState({ taskId: dragRef.current.taskId, dxDays })
    }
    function onMouseUp(ev) {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      commitDrag(ev.clientX)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [pxPerDay, onTaskClick, onTaskChange])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!tasks.length) return <div style={{ padding: 24, color: 'var(--gx-text-muted)' }}>No tasks yet — use the + button to add one.</div>

  const todayStr = toStr(new Date())
  const todayX = dateToX(todayStr, rangeStartStr, pxPerDay)

  const legend = categories.length > 0 && (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '5px 10px', borderTop: '1px solid var(--gx-border)', alignItems: 'center', background: 'var(--gx-surface)', flexShrink: 0 }}>
      {categories.map(cat => {
        const fill = getCatColor(cat)
        const isEditing = editingCat === cat
        return (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* colour swatch + picker */}
            <label title="Change colour" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
              <span style={{ width: 11, height: 11, borderRadius: 2, background: fill, flexShrink: 0, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} />
              <input type="color" value={fill} onChange={e => onColorChange?.(cat, e.target.value)}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
            </label>
            {/* name — tap to rename */}
            {isEditing ? (
              <input
                autoFocus
                defaultValue={cat}
                style={{ fontSize: 12, padding: '1px 4px', border: '1px solid var(--gx-accent)', borderRadius: 3, width: 80, background: 'var(--gx-bg)', color: 'var(--gx-text)' }}
                onBlur={e => { onRenameCategory?.(cat, e.target.value); setEditingCat(null) }}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingCat(null) }}
              />
            ) : (
              <span
                onClick={() => setEditingCat(cat)}
                title="Tap to rename"
                style={{ fontSize: 12, color: 'var(--gx-text-muted)', cursor: 'text', borderBottom: '1px dashed var(--gx-border)' }}
              >{cat}</span>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div ref={exportRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none', minHeight: 0 }}>
      {/* Chart */}
      <div
        ref={node => { scrollRef.current = node; if (scrollExportRef) scrollExportRef.current = node }}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'auto', minHeight: 0 }}
      >
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
            {/* Dependency arrows */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2, overflow: 'visible' }}>
              <defs>
                <marker id="dep-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="rgba(99,102,241,0.7)" />
                </marker>
              </defs>
              {tasks.map((task, toIdx) => {
                if (!task.dependencies) return null
                const depIds = task.dependencies.split(',').map(s => s.trim()).filter(Boolean)
                return depIds.map(depId => {
                  const fromIdx = tasks.findIndex(t => t.id === depId)
                  if (fromIdx < 0) return null
                  const fromTask = tasks[fromIdx]
                  const isDraggingFrom = dragState?.taskId === fromTask.id
                  const isDraggingTo = dragState?.taskId === task.id
                  let fs = fromTask.start, fe = fromTask.end
                  let ts = task.start, te = task.end
                  if (isDraggingFrom && dragRef.current) {
                    const d = dragState.dxDays; const { type, origStart, origEnd } = dragRef.current
                    if (type === 'move') { fs = addDays(origStart, d); fe = addDays(origEnd, d) }
                    else if (type === 'resize-end') { fe = addDays(origEnd, d) }
                  }
                  if (isDraggingTo && dragRef.current) {
                    const d = dragState.dxDays; const { type, origStart, origEnd } = dragRef.current
                    if (type === 'move') { ts = addDays(origStart, d); te = addDays(origEnd, d) }
                    else if (type === 'resize-start') { ts = addDays(origStart, d) }
                    else if (type === 'resize-end') { te = addDays(origEnd, d) }
                  }
                  const x1 = dateToX(fe, rangeStartStr, pxPerDay)
                  const y1 = fromIdx * ROW_H + ROW_H / 2
                  const x2 = dateToX(ts, rangeStartStr, pxPerDay)
                  const y2 = toIdx * ROW_H + ROW_H / 2
                  const x2end = dateToX(te, rangeStartStr, pxPerDay)

                  const MARGIN = 18
                  const APPROACH = 10  // approach dest bar from this many px left

                  let arrowPath
                  if (x2 >= x1) {
                    // Normal forward: exit right, drop, arrive at dest left edge
                    const ex = Math.min(MARGIN, Math.max(2, (x2 - x1) / 2))
                    arrowPath = `M${x1},${y1} H${x1+ex} V${y2} H${x2}`
                  } else {
                    // Overlap: exit to the right of BOTH bars so the drop never
                    // crosses the destination bar, then approach from the left.
                    const rightExit = Math.max(x1, x2end) + MARGIN
                    const leftApproach = x2 - APPROACH
                    if (toIdx > fromIdx) {
                      // Dest is below predecessor: drop past dest bar bottom, rise from left
                      const loopY = toIdx * ROW_H + BAR_Y + BAR_H + 6
                      arrowPath = `M${x1},${y1} H${rightExit} V${loopY} H${leftApproach} V${y2} H${x2}`
                    } else {
                      // Dest is above predecessor: rise past dest bar top, drop from left
                      const loopY = toIdx * ROW_H + BAR_Y - 6
                      arrowPath = `M${x1},${y1} H${rightExit} V${loopY} H${leftApproach} V${y2} H${x2}`
                    }
                  }
                  return (
                    <path key={`${depId}-${task.id}`}
                      d={arrowPath}
                      fill="none" stroke="rgba(99,102,241,0.6)" strokeWidth="1.5"
                      strokeDasharray="4 2" markerEnd="url(#dep-arrow)"
                    />
                  )
                })
              })}
            </svg>
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
                  onMouseDown={ev => onMouseDown(ev, task)}
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
      {legend}
    </div>
  )
}
