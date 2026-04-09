import { useRef, useCallback, useMemo, useState } from 'react'

// ── date helpers ─────────────────────────────────────────────────────────────

function parseDate(str) { return new Date(str + 'T00:00:00') }
function toStr(d) { return d.toISOString().substring(0, 10) }
function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000) }
function addDays(str, n) { const d = parseDate(str); d.setDate(d.getDate() + n); return toStr(d) }
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
  d.setFullYear(d.getFullYear() + 1); return d
}
function colLabel(date, unit) {
  if (unit === 'Month') return date.toLocaleString('default', { month: 'short', year: '2-digit' })
  if (unit === 'Quarter') return `Q${Math.floor(date.getMonth() / 3) + 1} '${String(date.getFullYear()).slice(2)}`
  return String(date.getFullYear())
}

const COL_PX = { Week: 56, Month: 80, Quarter: 110, Year: 130 }
const WEEK_MS = 7 * 86400000
const ROW_H = 52
const BAR_H = 30
const BAR_Y = (ROW_H - BAR_H) / 2
const LABEL_W = 140
const HEADER_H = 44
const EDGE_PX = 14   // px from bar edge = resize zone

// ── column generation ────────────────────────────────────────────────────────

function buildColumns(rangeStart, rangeEnd, unit) {
  const cols = []
  if (unit === 'Week') {
    // weekly columns: align to Monday
    let cur = new Date(rangeStart)
    cur.setDate(cur.getDate() - cur.getDay() + 1) // Monday
    while (cur <= rangeEnd) {
      cols.push({ date: new Date(cur), label: `${cur.toLocaleString('default',{month:'short'})} ${cur.getDate()}` })
      cur = new Date(cur.getTime() + WEEK_MS)
    }
    return cols
  }
  let cur = floorToUnit(new Date(rangeStart), unit)
  while (cur <= rangeEnd) {
    cols.push({ date: new Date(cur), label: colLabel(cur, unit) })
    cur = advanceUnit(cur, unit)
  }
  return cols
}

function dateToX(dateStr, rangeStart, pxPerDay) {
  return daysBetween(toStr(rangeStart), dateStr) * pxPerDay
}

// ── main component ───────────────────────────────────────────────────────────

export default function CustomGantt({ tasks, viewMode = 'Month', categoryColors = {}, onTaskChange, onTaskClick }) {
  const scrollRef = useRef(null)
  const dragRef = useRef(null)   // { taskId, type, startClientX, origStart, origEnd, pxPerDay }
  const [dragState, setDragState] = useState(null)  // { taskId, dxDays }

  const colPx = COL_PX[viewMode] || 80

  // Date range with padding
  const { rangeStart, rangeEnd, pxPerDay, columns, totalW } = useMemo(() => {
    if (!tasks.length) return { rangeStart: new Date(), rangeEnd: new Date(), pxPerDay: 1, columns: [], totalW: 400 }

    const starts = tasks.map(t => parseDate(t.start))
    const ends = tasks.map(t => parseDate(t.end))
    const minD = new Date(Math.min(...starts))
    const maxD = new Date(Math.max(...ends))

    // pad by one unit on each side
    const padded = floorToUnit(new Date(minD), viewMode)
    padded.setDate(padded.getDate() - 1)
    const paddedEnd = advanceUnit(floorToUnit(new Date(maxD), viewMode), viewMode)

    const cols = buildColumns(padded, paddedEnd, viewMode)
    const totalDays = daysBetween(toStr(padded), toStr(paddedEnd)) || 1
    const totalW = cols.length * colPx
    const pxPerDay = totalW / totalDays

    return { rangeStart: padded, rangeEnd: paddedEnd, pxPerDay, columns: cols, totalW }
  }, [tasks, viewMode, colPx])

  // Touch drag handlers
  const onTouchStart = useCallback((e, task) => {
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const localX = touch.clientX - rect.left
    const barW = rect.width
    let type = 'move'
    if (localX <= EDGE_PX) type = 'resize-start'
    else if (localX >= barW - EDGE_PX) type = 'resize-end'

    dragRef.current = {
      taskId: task.id,
      type,
      startClientX: touch.clientX,
      origStart: task.start,
      origEnd: task.end,
      pxPerDay,
    }
    setDragState({ taskId: task.id, dxDays: 0 })
    e.stopPropagation()
  }, [pxPerDay])

  const onTouchMove = useCallback((e) => {
    if (!dragRef.current) return
    const dx = e.touches[0].clientX - dragRef.current.startClientX
    const dxDays = Math.round(dx / dragRef.current.pxPerDay)
    setDragState({ taskId: dragRef.current.taskId, dxDays })
    e.preventDefault()
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (!dragRef.current) return
    const { taskId, type, origStart, origEnd, pxPerDay: ppd } = dragRef.current
    const dx = (e.changedTouches[0]?.clientX ?? 0) - dragRef.current.startClientX
    const dxDays = Math.round(dx / ppd)

    if (Math.abs(dxDays) < 1) {
      // treat as tap
      onTaskClick?.(taskId)
    } else {
      let newStart = origStart, newEnd = origEnd
      if (type === 'move') {
        newStart = addDays(origStart, dxDays)
        newEnd = addDays(origEnd, dxDays)
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

  // click handler for desktop
  const onBarClick = useCallback((e, task) => {
    onTaskClick?.(task.id)
  }, [onTaskClick])

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]
  const DEFAULT_COLORS = ['#6366f1','#0d9488','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']
  function catColor(cat) {
    const idx = categories.indexOf(cat)
    return categoryColors[cat] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length] || '#6366f1'
  }
  function isLight(hex) {
    const h = hex.replace('#', '')
    const [r,g,b] = [0,2,4].map(i => parseInt(h.slice(i,i+2),16))
    return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.55
  }

  // Today marker
  const todayX = dateToX(toStr(new Date()), toStr(rangeStart), pxPerDay)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, userSelect: 'none' }}>
      {/* Colour legend */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--gx-border)', flexShrink: 0 }}>
          {categories.map((cat, i) => {
            const fill = catColor(cat)
            return (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, color: 'var(--gx-text-muted)' }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: fill, display: 'inline-block', flexShrink: 0 }} />
                <input type="color" value={fill} onChange={e => categoryColors[cat] = e.target.value}
                  style={{ width: 0, height: 0, padding: 0, border: 'none', opacity: 0, position: 'absolute' }} />
                {cat}
              </label>
            )
          })}
        </div>
      )}

      {/* Chart area */}
      <div
        ref={scrollRef}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative', minHeight: 0 }}
      >
        <div style={{ display: 'flex', minWidth: totalW + LABEL_W }}>
          {/* Fixed label column */}
          <div style={{ width: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 3, background: 'var(--gx-surface)' }}>
            {/* Header */}
            <div style={{ height: HEADER_H, borderBottom: '2px solid var(--gx-border)', borderRight: '1px solid var(--gx-border)', display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 11, fontWeight: 700, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Task
            </div>
            {/* Task label rows */}
            {tasks.map(task => (
              <div key={task.id}
                onClick={() => onTaskClick?.(task.id)}
                style={{ height: ROW_H, display: 'flex', alignItems: 'center', paddingLeft: 10, paddingRight: 6, borderBottom: '1px solid var(--gx-border)', borderRight: '1px solid var(--gx-border)', fontSize: 12, fontWeight: 500, color: 'var(--gx-text)', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                title={task.name}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: catColor(task.category), flexShrink: 0, marginRight: 6 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.name}</span>
              </div>
            ))}
          </div>

          {/* Scrollable chart */}
          <div style={{ flex: 1, position: 'relative', width: totalW }}>
            {/* Column headers */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2, background: 'var(--gx-surface)', height: HEADER_H, borderBottom: '2px solid var(--gx-border)' }}>
              {columns.map((col, i) => (
                <div key={i} style={{ width: colPx, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--gx-text-muted)', borderRight: '1px solid var(--gx-border)' }}>
                  {col.label}
                </div>
              ))}
            </div>

            {/* Grid + bars */}
            <div style={{ position: 'relative', width: totalW, height: tasks.length * ROW_H }}>
              {/* Vertical grid lines */}
              {columns.map((col, i) => (
                <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * colPx, width: 1, background: 'var(--gx-border)' }} />
              ))}

              {/* Today line */}
              {todayX > 0 && todayX < totalW && (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayX, width: 2, background: 'var(--gx-accent)', opacity: 0.6, zIndex: 1 }} />
              )}

              {/* Task rows background */}
              {tasks.map((_, i) => (
                <div key={i} style={{ position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H, borderBottom: '1px solid var(--gx-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gx-bg-alt)' }} />
              ))}

              {/* Bars */}
              {tasks.map((task, rowIdx) => {
                const fill = catColor(task.category)
                const textColor = isLight(fill) ? '#1a1a1a' : '#fff'
                const isDragging = dragState?.taskId === task.id

                // Apply drag offset
                let dispStart = task.start, dispEnd = task.end
                if (isDragging && dragRef.current) {
                  const { type, origStart, origEnd, pxPerDay: ppd } = dragRef.current
                  const dxDays = dragState.dxDays
                  if (type === 'move') {
                    dispStart = addDays(origStart, dxDays)
                    dispEnd = addDays(origEnd, dxDays)
                  } else if (type === 'resize-start') {
                    dispStart = addDays(origStart, dxDays)
                    if (dispStart >= dispEnd) dispStart = addDays(dispEnd, -1)
                  } else {
                    dispEnd = addDays(origEnd, dxDays)
                    if (dispEnd <= dispStart) dispEnd = addDays(dispStart, 1)
                  }
                }

                const x = dateToX(dispStart, toStr(rangeStart), pxPerDay)
                const w = Math.max(12, dateToX(dispEnd, toStr(rangeStart), pxPerDay) - x)
                const top = rowIdx * ROW_H + BAR_Y

                // Progress fill width
                const progressW = w * ((task.progress ?? 0) / 100)

                return (
                  <div
                    key={task.id}
                    onTouchStart={e => onTouchStart(e, task)}
                    onClick={e => onBarClick(e, task)}
                    style={{
                      position: 'absolute',
                      left: x,
                      top,
                      width: w,
                      height: BAR_H,
                      borderRadius: 4,
                      background: fill,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.15)',
                      zIndex: isDragging ? 10 : 1,
                      transition: isDragging ? 'none' : 'box-shadow 0.15s',
                      touchAction: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      overflow: 'hidden',
                      userSelect: 'none',
                    }}
                  >
                    {/* Progress bar */}
                    {progressW > 0 && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: progressW, height: '100%', background: 'rgba(0,0,0,0.2)', borderRadius: '4px 0 0 4px' }} />
                    )}
                    {/* Resize handle left */}
                    <div style={{ width: EDGE_PX, height: '100%', flexShrink: 0, cursor: 'ew-resize', zIndex: 2 }} />
                    {/* Label */}
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', pointerEvents: 'none' }}>
                      {w > 40 ? task.name : ''}
                    </span>
                    {/* Resize handle right */}
                    <div style={{ width: EDGE_PX, height: '100%', flexShrink: 0, cursor: 'ew-resize', zIndex: 2 }} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
