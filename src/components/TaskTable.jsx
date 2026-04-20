import { useState } from 'react'

const DEFAULT_COLORS = ['#0d9488','#f59e0b','#8b5cf6','#ef4444','#10b981','#f97316','#6366f1','#ec4899','#14b8a6','#84cc16']

const DEFAULT_COL_WIDTHS = { name: 160, start: 82, end: 82, dur: 52, category: 110, progress: 52, deps: 130 }
const MIN_COL_WIDTHS    = { name: 60,  start: 60, end: 60, dur: 36, category: 60,  progress: 36, deps: 50  }

function loadColWidths() {
  try {
    const saved = JSON.parse(localStorage.getItem('gantt-colWidths') || '{}')
    return { ...DEFAULT_COL_WIDTHS, ...saved }
  } catch { return { ...DEFAULT_COL_WIDTHS } }
}

function DepsModal({ task, tasks, onSave, onClose }) {
  const [deps, setDeps] = useState(() =>
    new Set(task.dependencies ? task.dependencies.split(',').map(s => s.trim()).filter(Boolean) : [])
  )
  const others = tasks.filter(t => t.id !== task.id)
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 51, background: 'var(--gx-surface)', borderRadius: 12, padding: '20px 20px 16px',
        width: 340, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gx-text)' }}>Dependencies</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--gx-text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--gx-text-muted)' }}>{task.name}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {others.map(t => (
            <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--gx-text)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={deps.has(t.id)}
                onChange={e => setDeps(prev => {
                  const next = new Set(prev)
                  e.target.checked ? next.add(t.id) : next.delete(t.id)
                  return next
                })}
                style={{ accentColor: 'var(--gx-accent)', width: 16, height: 16, flexShrink: 0 }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { onSave([...deps].join(', ')); onClose() }} className="gx-btn gx-btn-primary" style={{ flex: 1, padding: '9px', fontSize: 14 }}>Save</button>
          <button onClick={onClose} className="gx-btn gx-btn-secondary" style={{ flex: 1, padding: '9px', fontSize: 14 }}>Cancel</button>
        </div>
      </div>
    </>
  )
}

function duration(start, end) {
  const ms = new Date(end + 'T00:00:00') - new Date(start + 'T00:00:00')
  const days = Math.round(ms / 86400000)
  if (days < 0) return '—'
  if (days < 30) return `${days}d`
  const months = Math.round(days / 30.4)
  return `${months}mo`
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} '${y.slice(2)}`
}

function DateCell({ value, min, onChange }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value)
  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        value={local}
        min={min}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { setEditing(false); if (local !== value) onChange(local) }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.target.blur() }}
        style={{ width: '100%', padding: '2px 4px', fontSize: 12, border: 'none', background: 'transparent', color: 'var(--gx-text)', outline: 'none', fontFamily: 'inherit' }}
      />
    )
  }
  return (
    <span
      onClick={() => { setLocal(value); setEditing(true) }}
      style={{ display: 'block', padding: '4px 6px', fontSize: 12, color: 'var(--gx-text)', cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
    >{fmtDate(value)}</span>
  )
}

function Cell({ value, onChange, type = 'text', min, style }) {
  const [local, setLocal] = useState(value)
  return (
    <input type={type} value={local}
      min={min}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onChange(local) }}
      style={{
        width: '100%', padding: '4px 6px', fontSize: 12,
        border: 'none', background: 'transparent', color: 'var(--gx-text)',
        outline: 'none', fontFamily: 'inherit', ...style,
      }}
      onFocus={e => e.target.select()}
    />
  )
}

export default function TaskTable({ tasks, categories, onUpdate, onDelete, onAdd, onMove, tableHeight = 240 }) {
  const [openDepsId, setOpenDepsId] = useState(null)
  const [colWidths, setColWidths] = useState(loadColWidths)

  function startColResize(key, e) {
    const isTouch = e.type === 'touchstart'
    const startX = isTouch ? e.touches[0].clientX : e.clientX
    const startW = colWidths[key]
    let lastW = startW
    function onMove(ev) {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX
      lastW = Math.max(MIN_COL_WIDTHS[key] ?? 40, startW + x - startX)
      setColWidths(prev => ({ ...prev, [key]: lastW }))
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      setColWidths(prev => {
        const next = { ...prev, [key]: lastW }
        try { localStorage.setItem('gantt-colWidths', JSON.stringify(next)) } catch {}
        return next
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    e.preventDefault()
    e.stopPropagation()
  }

  function getDepNames(task) {
    if (!task.dependencies) return []
    return task.dependencies.split(',').map(s => s.trim()).filter(Boolean)
      .map(id => { const t = tasks.find(x => x.id === id); return t ? t.name : null })
      .filter(Boolean)
  }

  const thBase = {
    padding: '6px 8px', fontSize: 11, fontWeight: 700, color: 'var(--gx-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left',
    borderBottom: '2px solid var(--gx-border)', whiteSpace: 'nowrap',
    background: 'var(--gx-surface)', position: 'sticky', top: 0, zIndex: 2,
  }
  const td = { padding: '2px 4px', borderBottom: '1px solid var(--gx-border)', verticalAlign: 'middle', overflow: 'hidden' }

  // Resizable th: label + drag handle on right edge
  function RH({ colKey, label, extra = {} }) {
    return (
      <th style={{ ...thBase, width: colWidths[colKey], maxWidth: colWidths[colKey], position: 'sticky', top: 0, zIndex: 2, overflow: 'visible', ...extra }}>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', paddingRight: 6 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          <div
            onMouseDown={e => startColResize(colKey, e)}
            onTouchStart={e => startColResize(colKey, e)}
            style={{
              position: 'absolute', right: -3, top: -6, bottom: -6, width: 10,
              cursor: 'col-resize', zIndex: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{ width: 2, height: 14, borderRadius: 1, background: 'var(--gx-border)' }} />
          </div>
        </div>
      </th>
    )
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', height: tableHeight, flexShrink: 0 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ ...thBase, width: 32 }}>#</th>
            <RH colKey="name" label="Task name" />
            <RH colKey="start" label="Start" />
            <RH colKey="end" label="End" />
            <RH colKey="dur" label="Dur" />
            <RH colKey="category" label="Category" />
            <RH colKey="progress" label="%" />
            <RH colKey="deps" label="Deps" />
            <th style={{ ...thBase, width: 72 }}></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, idx) => {
            const catIdx = categories.indexOf(task.category)
            const dot = DEFAULT_COLORS[Math.max(0, catIdx) % DEFAULT_COLORS.length]
            return (
              <tr key={task.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--gx-bg-alt)' }}>
                <td style={{ ...td, padding: '2px 8px', color: 'var(--gx-text-muted)', fontSize: 11, width: 32 }}>{idx + 1}</td>
                <td style={{ ...td, width: colWidths.name }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <label title={task.color ? 'Custom colour — click to change, right-click to reset' : 'Click to set a custom task colour'} style={{ flexShrink: 0, cursor: 'pointer', position: 'relative', lineHeight: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: task.color || dot, display: 'block', border: task.color ? '1.5px solid rgba(0,0,0,0.25)' : '1px dashed rgba(128,128,128,0.5)', flexShrink: 0 }} />
                      <input type="color" value={task.color || dot}
                        onChange={e => onUpdate(task.id, { color: e.target.value })}
                        onContextMenu={e => { e.preventDefault(); onUpdate(task.id, { color: undefined }) }}
                        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
                    </label>
                    <Cell value={task.name} onChange={v => onUpdate(task.id, { name: v })} />
                  </div>
                </td>
                <td style={{ ...td, width: colWidths.start }}>
                  <DateCell value={task.start} onChange={v => onUpdate(task.id, { start: v })} />
                </td>
                <td style={{ ...td, width: colWidths.end }}>
                  <DateCell value={task.end} min={task.start} onChange={v => onUpdate(task.id, { end: v })} />
                </td>
                <td style={{ ...td, width: colWidths.dur, color: 'var(--gx-text-muted)', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                  {duration(task.start, task.end)}
                </td>
                <td style={{ ...td, width: colWidths.category }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: dot, flexShrink: 0 }} />
                    <Cell value={task.category || ''} onChange={v => onUpdate(task.id, { category: v })} />
                  </div>
                </td>
                <td style={{ ...td, width: colWidths.progress }}>
                  <Cell value={task.progress ?? 0} type="number" min="0"
                    onChange={v => onUpdate(task.id, { progress: Math.min(100, Math.max(0, Number(v))) })}
                    style={{ textAlign: 'right' }} />
                </td>
                <td style={{ ...td, width: colWidths.deps }}>
                  <div
                    onClick={() => setOpenDepsId(openDepsId === task.id ? null : task.id)}
                    title="Click to set which tasks must finish before this one starts"
                    style={{ cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 3, minHeight: 24, alignItems: 'center', padding: '2px 4px' }}
                  >
                    {getDepNames(task).length === 0
                      ? <span style={{ fontSize: 11, color: 'var(--gx-text-muted)' }}>—</span>
                      : getDepNames(task).map(name => (
                          <span key={name} style={{ fontSize: 10, background: 'var(--gx-border)', color: 'var(--gx-text-muted)', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
                            {name}
                          </span>
                        ))
                    }
                    <span style={{ fontSize: 10, color: 'var(--gx-accent)', marginLeft: 2 }}>✎</span>
                  </div>
                </td>
                <td style={{ ...td, width: 72, whiteSpace: 'nowrap', padding: '2px 6px' }}>
                  <button onClick={() => onMove(task.id, -1)} disabled={idx === 0}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--gx-text-muted)', fontSize: 13 }} title="Move up">↑</button>
                  <button onClick={() => onMove(task.id, 1)} disabled={idx === tasks.length - 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--gx-text-muted)', fontSize: 13 }} title="Move down">↓</button>
                  <button onClick={() => onDelete(task.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--gx-error)', fontSize: 14 }} title="Delete">×</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <button onClick={onAdd} className="gx-btn gx-btn-secondary"
        style={{ margin: '6px 8px', fontSize: 12, padding: '4px 12px' }}>
        + Add task
      </button>
      {openDepsId && (
        <DepsModal
          task={tasks.find(t => t.id === openDepsId)}
          tasks={tasks}
          onSave={deps => onUpdate(openDepsId, { dependencies: deps })}
          onClose={() => setOpenDepsId(null)}
        />
      )}
    </div>
  )
}
