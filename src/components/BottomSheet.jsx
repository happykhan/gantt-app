import { useState, useEffect } from 'react'

const CAT_COLORS = ['#6366f1','#0d9488','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

export default function BottomSheet({ task, categories, onUpdate, onDelete, onClose, onMoveUp, onMoveDown }) {
  const [name, setName] = useState(task?.name || '')
  const [start, setStart] = useState(task?.start || '')
  const [end, setEnd] = useState(task?.end || '')
  const [category, setCategory] = useState(task?.category || '')
  const [progress, setProgress] = useState(task?.progress ?? 0)

  useEffect(() => {
    if (task) {
      setName(task.name)
      setStart(task.start)
      setEnd(task.end)
      setCategory(task.category || '')
      setProgress(task.progress ?? 0)
    }
  }, [task?.id])

  if (!task) return null

  function save() {
    onUpdate(task.id, { name, start, end: end >= start ? end : start, category, progress })
    onClose()
  }

  const catIdx = categories.indexOf(category)
  const catColor = catIdx >= 0 ? CAT_COLORS[catIdx % CAT_COLORS.length] : '#94a3b8'

  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }
  const inputStyle = { width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid var(--gx-border)', borderRadius: 8, background: 'var(--gx-surface)', color: 'var(--gx-text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(2px)' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--gx-surface)',
        borderRadius: '16px 16px 0 0',
        padding: '0 0 env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--gx-border)' }} />
        </div>

        <div style={{ padding: '8px 20px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--gx-text)' }}>Edit task</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: 'var(--gx-text-muted)', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Task name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
              placeholder="Enter task name"
            />
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Start</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End</label>
              <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Category / Work Package</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: 2, background: catColor, pointerEvents: 'none' }} />
              <input
                type="text"
                value={category}
                list="bs-categories"
                onChange={e => setCategory(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 30 }}
                placeholder="WP1, WP2…"
              />
              <datalist id="bs-categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Progress — {progress}%</label>
            <input
              type="range"
              min={0} max={100} step={5}
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--gx-accent)' }}
            />
          </div>

          {/* Reorder */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={onMoveUp} disabled={!onMoveUp} className="gx-btn gx-btn-secondary" style={{ flex: 1, padding: '10px', fontSize: 18 }} title="Move task up">↑</button>
            <button onClick={onMoveDown} disabled={!onMoveDown} className="gx-btn gx-btn-secondary" style={{ flex: 1, padding: '10px', fontSize: 18 }} title="Move task down">↓</button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} className="gx-btn gx-btn-primary" style={{ flex: 1, padding: '12px', fontSize: 15 }}>
              Save
            </button>
            <button
              onClick={() => { onDelete(task.id); onClose() }}
              style={{ padding: '12px 18px', fontSize: 15, background: 'none', border: '1px solid var(--gx-error)', color: 'var(--gx-error)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
