import { useState, useEffect } from 'react'

const CAT_COLORS = ['#6366f1','#0d9488','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = e => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function BottomSheet({ task, tasks = [], categories, categoryColors = {}, onColorChange, onUpdate, onDelete, onClose, onMoveUp, onMoveDown }) {
  const [name, setName] = useState(task?.name || '')
  const [start, setStart] = useState(task?.start || '')
  const [end, setEnd] = useState(task?.end || '')
  const [category, setCategory] = useState(task?.category || '')
  const [progress, setProgress] = useState(task?.progress ?? 0)
  const [taskColor, setTaskColor] = useState(task?.color || '')
  const [deps, setDeps] = useState(() =>
    new Set(task?.dependencies ? task.dependencies.split(',').map(s => s.trim()).filter(Boolean) : [])
  )
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (task) {
      setName(task.name)
      setStart(task.start)
      setEnd(task.end)
      setCategory(task.category || '')
      setProgress(task.progress ?? 0)
      setTaskColor(task.color || '')
      setDeps(new Set(task.dependencies ? task.dependencies.split(',').map(s => s.trim()).filter(Boolean) : []))
    }
  }, [task?.id])

  if (!task) return null

  function save() {
    onUpdate(task.id, { name, start, end: end >= start ? end : start, category, progress, dependencies: [...deps].join(', '), color: taskColor || undefined })
    onClose()
  }

  const catIdx = categories.indexOf(category)
  const catColor = (category && categoryColors[category]) || (catIdx >= 0 ? CAT_COLORS[catIdx % CAT_COLORS.length] : '#94a3b8')

  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }
  const inputStyle = { width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid var(--gx-border)', borderRadius: 8, background: 'var(--gx-surface)', color: 'var(--gx-text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }

  const panelStyle = isDesktop
    ? {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 50, width: 480, maxWidth: '90vw', maxHeight: '90vh',
        background: 'var(--gx-surface)', borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
        overflowY: 'auto',
      }
    : {
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--gx-surface)', borderRadius: '16px 16px 0 0',
        padding: '0 0 env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        maxHeight: '85vh', overflowY: 'auto',
      }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(2px)' }}
      />

      <div style={panelStyle}>
        {/* Drag handle — mobile only */}
        {!isDesktop && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--gx-border)' }} />
          </div>
        )}

        <div style={{ padding: isDesktop ? '20px 24px 24px' : '8px 20px 20px' }}>
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
            <label style={labelStyle}>Category</label>
            <div style={{ position: 'relative' }}>
              <label style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: catColor, border: '1px solid rgba(0,0,0,0.2)', display: 'block' }} />
                <input
                  type="color"
                  value={catColor}
                  onChange={e => onColorChange?.(category, e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                />
              </label>
              <input
                type="text"
                value={category}
                list="bs-categories"
                onChange={e => setCategory(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 32 }}
                placeholder="WP1, WP2…"
              />
              <datalist id="bs-categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <span style={{ fontSize: 11, color: 'var(--gx-text-muted)', marginTop: 3, display: 'block' }}>Tap colour swatch to change WP colour</span>
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

          {/* Task colour override */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Task colour</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label title="Pick a custom colour for this task" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: 6, background: taskColor || catColor, border: '2px solid var(--gx-border)', display: 'block', flexShrink: 0 }} />
                <input type="color" value={taskColor || catColor} onChange={e => setTaskColor(e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--gx-text-muted)' }}>{taskColor ? 'Custom' : 'From category'}</span>
              </label>
              {taskColor && (
                <button onClick={() => setTaskColor('')} style={{ fontSize: 12, background: 'none', border: '1px solid var(--gx-border)', borderRadius: 6, padding: '4px 10px', color: 'var(--gx-text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Depends on */}
          {tasks.filter(t => t.id !== task.id).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Depends on</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto', padding: '4px 0' }}>
                {tasks.filter(t => t.id !== task.id).map(t => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--gx-text)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={deps.has(t.id)}
                      onChange={e => setDeps(prev => {
                        const next = new Set(prev)
                        e.target.checked ? next.add(t.id) : next.delete(t.id)
                        return next
                      })}
                      style={{ accentColor: 'var(--gx-accent)', width: 18, height: 18, flexShrink: 0 }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
