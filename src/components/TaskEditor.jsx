import { useState } from 'react'

const CAT_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

const inputStyle = {
  width: '100%',
  border: '1px solid transparent',
  borderRadius: 4,
  padding: '3px 5px',
  fontSize: 13,
  background: 'transparent',
  color: 'var(--gx-text)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

function Field({ value, onChange, type = 'text', placeholder = '', min, list, style = {} }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      min={min}
      list={list}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        ...style,
        border: focused ? '1px solid var(--gx-accent)' : '1px solid transparent',
        background: focused ? 'var(--gx-surface)' : 'transparent',
      }}
    />
  )
}

function TaskRow({ task, categories, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  // Local name state — only pushed to chart on blur to avoid per-keystroke SVG re-renders
  const [localName, setLocalName] = useState(task.name)
  const catIdx = categories.indexOf(task.category)
  const catColor = catIdx >= 0 ? CAT_COLORS[catIdx % CAT_COLORS.length] : '#94a3b8'

  // Keep local name in sync if parent updates it externally (e.g. load project)
  if (task.name !== localName && document.activeElement?.dataset?.taskId !== task.id) {
    setLocalName(task.name)
  }

  function set(field, value) { onUpdate(task.id, { [field]: value }) }

  return (
    <div style={{ borderBottom: '1px solid var(--gx-border)' }}>
      {/* Primary row: always visible */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: catColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name uses local state; chart only updates on blur */}
          <input
            type="text"
            value={localName}
            data-task-id={task.id}
            placeholder="Task name"
            onChange={e => setLocalName(e.target.value)}
            onBlur={() => set('name', localName)}
            style={{
              ...inputStyle,
              fontWeight: 500,
              border: '1px solid transparent',
              background: 'transparent',
            }}
            onFocus={e => { e.target.style.border = '1px solid var(--gx-accent)'; e.target.style.background = 'var(--gx-surface)' }}
          />
        </div>
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          title="Edit dates & details"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: expanded ? 'var(--gx-accent)' : 'var(--gx-text-muted)',
            fontSize: 16, lineHeight: 1, padding: '2px 4px', borderRadius: 4,
            flexShrink: 0,
          }}
        >
          {expanded ? '▲' : '▼'}
        </button>
        <button
          onClick={() => onDelete(task.id)}
          title="Delete"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gx-text-muted)', fontSize: 18, lineHeight: 1,
            padding: '2px 4px', borderRadius: 4, flexShrink: 0,
          }}
          onMouseEnter={e => e.target.style.color = 'var(--gx-error)'}
          onMouseLeave={e => e.target.style.color = 'var(--gx-text-muted)'}
        >
          ×
        </button>
      </div>

      {/* Expanded detail row */}
      {expanded && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          padding: '6px 8px 10px',
          background: 'var(--gx-bg-alt)',
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start</span>
            <Field type="date" value={task.start} onChange={v => set('start', v)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End</span>
            <Field type="date" value={task.end} min={task.start} onChange={v => set('end', v)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</span>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                width: 8, height: 8, borderRadius: 2, background: catColor, pointerEvents: 'none',
              }} />
              <input
                type="text"
                defaultValue={task.category}
                placeholder="WP1…"
                list={`cats-${task.id}`}
                onBlur={e => set('category', e.target.value)}
                style={{ ...inputStyle, paddingLeft: 20, border: '1px solid transparent', background: 'transparent' }}
                onFocus={e => { e.target.style.border = '1px solid var(--gx-accent)'; e.target.style.background = 'var(--gx-surface)' }}
              />
              <datalist id={`cats-${task.id}`}>
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>% Done</span>
            <Field
              type="number"
              value={task.progress ?? 0}
              onChange={v => set('progress', Math.min(100, Math.max(0, parseInt(v) || 0)))}
              style={{ textAlign: 'right' }}
            />
          </label>
        </div>
      )}
    </div>
  )
}

export default function TaskEditor({ tasks, onUpdate, onDelete, onAdd, categories }) {
  function handleAddRow() {
    const last = tasks[tasks.length - 1]
    const start = last?.end || new Date().toISOString().substring(0, 10)
    const end = new Date(new Date(start).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    onAdd({ name: 'New task', start, end, category: last?.category || '', dependencies: '', progress: 0 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header */}
      <div style={{
        padding: '6px 12px',
        background: 'var(--gx-bg-alt)',
        borderBottom: '1px solid var(--gx-border)',
        fontSize: 11, fontWeight: 600,
        color: 'var(--gx-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        Tasks — click ▼ to edit dates
      </div>

      {tasks.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          categories={categories}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}

      <button
        onClick={handleAddRow}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', fontSize: 13,
          color: 'var(--gx-accent)', background: 'none',
          border: 'none', borderTop: '1px solid var(--gx-border)',
          cursor: 'pointer', width: '100%', textAlign: 'left',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--gx-accent-dim)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add task
      </button>
    </div>
  )
}
