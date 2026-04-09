const CAT_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

const colStyle = {
  header: {
    display: 'grid',
    gridTemplateColumns: '1fr 100px 100px 80px 60px 28px',
    gap: 4,
    padding: '6px 8px',
    background: 'var(--gx-bg-alt)',
    borderBottom: '1px solid var(--gx-border)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--gx-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 100px 100px 80px 60px 28px',
    gap: 4,
    padding: '5px 8px',
    borderBottom: '1px solid var(--gx-border)',
    alignItems: 'center',
  },
}

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
}

const focusStyle = {
  border: '1px solid var(--gx-accent)',
  background: 'var(--gx-surface)',
}

function Field({ value, onChange, type = 'text', placeholder = '', min, list }) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      list={list}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
      onFocus={e => Object.assign(e.target.style, focusStyle)}
      onBlur={e => Object.assign(e.target.style, { border: '1px solid transparent', background: 'transparent' })}
    />
  )
}

export default function TaskEditor({ tasks, onUpdate, onDelete, onAdd, categories }) {
  function handleField(id, field, value) {
    onUpdate(id, { [field]: value })
  }

  function handleAddRow() {
    const last = tasks[tasks.length - 1]
    const start = last?.end || new Date().toISOString().substring(0, 10)
    const end = new Date(new Date(start).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    onAdd({ name: 'New task', start, end, category: last?.category || '', dependencies: '', progress: 0 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header */}
      <div style={colStyle.header}>
        <span>Task name</span>
        <span>Start</span>
        <span>End</span>
        <span>Category</span>
        <span>% Done</span>
        <span />
      </div>

      {/* Rows */}
      {tasks.map((task) => {
        const catIdx = categories.indexOf(task.category)
        const catColor = catIdx >= 0 ? CAT_COLORS[catIdx % CAT_COLORS.length] : '#94a3b8'
        return (
          <div
            key={task.id}
            style={colStyle.row}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--gx-surface-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Name */}
            <Field
              value={task.name}
              onChange={v => handleField(task.id, 'name', v)}
              placeholder="Task name"
            />
            {/* Start */}
            <Field
              type="date"
              value={task.start}
              onChange={v => handleField(task.id, 'start', v)}
            />
            {/* End */}
            <Field
              type="date"
              value={task.end}
              min={task.start}
              onChange={v => handleField(task.id, 'end', v)}
            />
            {/* Category */}
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)',
                width: 8, height: 8, borderRadius: 2, background: catColor, pointerEvents: 'none',
              }} />
              <input
                type="text"
                value={task.category}
                list={`cats-${task.id}`}
                placeholder="WP1…"
                onChange={e => handleField(task.id, 'category', e.target.value)}
                style={{ ...inputStyle, paddingLeft: 18 }}
                onFocus={e => Object.assign(e.target.style, focusStyle)}
                onBlur={e => Object.assign(e.target.style, { border: '1px solid transparent', background: 'transparent' })}
              />
              <datalist id={`cats-${task.id}`}>
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            {/* Progress */}
            <input
              type="number"
              value={task.progress ?? 0}
              min={0}
              max={100}
              onChange={e => handleField(task.id, 'progress', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              style={{ ...inputStyle, textAlign: 'right' }}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e => Object.assign(e.target.style, { border: '1px solid transparent', background: 'transparent' })}
            />
            {/* Delete */}
            <button
              onClick={() => onDelete(task.id)}
              title="Delete task"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--gx-text-muted)', fontSize: 18, lineHeight: 1,
                padding: '2px 4px', borderRadius: 4,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.target.style.color = 'var(--gx-error)'}
              onMouseLeave={e => e.target.style.color = 'var(--gx-text-muted)'}
            >
              ×
            </button>
          </div>
        )
      })}

      {/* Add row */}
      <button
        onClick={handleAddRow}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', fontSize: 13,
          color: 'var(--gx-accent)', background: 'none',
          border: 'none', borderTop: '1px solid var(--gx-border)',
          cursor: 'pointer', width: '100%', textAlign: 'left',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--gx-accent-dim)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add task
      </button>
    </div>
  )
}
