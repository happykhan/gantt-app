import { useState } from 'react'

const DEFAULT_COLORS = ['#6366f1','#0d9488','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

function duration(start, end) {
  const ms = new Date(end + 'T00:00:00') - new Date(start + 'T00:00:00')
  const days = Math.round(ms / 86400000)
  if (days < 0) return '—'
  if (days < 30) return `${days}d`
  const months = Math.round(days / 30.4)
  return `${months}mo`
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

export default function TaskTable({ tasks, categories, onUpdate, onDelete, onAdd, onMove }) {
  const th = { padding: '6px 8px', fontSize: 11, fontWeight: 700, color: 'var(--gx-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left',
    borderBottom: '2px solid var(--gx-border)', whiteSpace: 'nowrap', background: 'var(--gx-surface)', position: 'sticky', top: 0 }
  const td = { padding: '2px 4px', borderBottom: '1px solid var(--gx-border)', verticalAlign: 'middle' }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 240, flexShrink: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={{ ...th, minWidth: 160 }}>Task name</th>
            <th style={th}>Start</th>
            <th style={th}>End</th>
            <th style={th}>Dur</th>
            <th style={th}>Category</th>
            <th style={{ ...th, width: 60 }}>%</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, idx) => {
            const catIdx = categories.indexOf(task.category)
            const dot = DEFAULT_COLORS[Math.max(0, catIdx) % DEFAULT_COLORS.length]
            return (
              <tr key={task.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--gx-bg-alt)' }}>
                <td style={{ ...td, padding: '2px 8px', color: 'var(--gx-text-muted)', fontSize: 11 }}>{idx + 1}</td>
                <td style={td}>
                  <Cell value={task.name} onChange={v => onUpdate(task.id, { name: v })} />
                </td>
                <td style={td}>
                  <Cell value={task.start} type="date" onChange={v => onUpdate(task.id, { start: v })} style={{ width: 120 }} />
                </td>
                <td style={td}>
                  <Cell value={task.end} type="date" min={task.start} onChange={v => onUpdate(task.id, { end: v })} style={{ width: 120 }} />
                </td>
                <td style={{ ...td, color: 'var(--gx-text-muted)', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                  {duration(task.start, task.end)}
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: dot, flexShrink: 0 }} />
                    <Cell value={task.category || ''} onChange={v => onUpdate(task.id, { category: v })} />
                  </div>
                </td>
                <td style={td}>
                  <Cell value={task.progress ?? 0} type="number" min="0"
                    onChange={v => onUpdate(task.id, { progress: Math.min(100, Math.max(0, Number(v))) })}
                    style={{ width: 48, textAlign: 'right' }} />
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap', padding: '2px 6px' }}>
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
    </div>
  )
}
