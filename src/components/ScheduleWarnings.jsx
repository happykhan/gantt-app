export default function ScheduleWarnings({ warnings, onMove, isMobile = false }) {
  if (!warnings.length) return null

  return (
    <details open style={{ flexShrink: 0, borderBottom: '1px solid var(--gx-border)', background: 'var(--gx-bg-alt)' }}>
      <summary style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--gx-text)', fontSize: 13, fontWeight: 700 }}>
        ⚠ {warnings.length} scheduling {warnings.length === 1 ? 'warning' : 'warnings'}
      </summary>
      <div aria-live="polite" style={{ maxHeight: isMobile ? 190 : 150, overflowY: 'auto', padding: '0 10px 9px', display: 'grid', gap: 6 }}>
        {warnings.map(warning => (
          <div key={warning.taskId} style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center', gap: 8,
            padding: '8px 10px', borderRadius: 7,
            border: '1px solid var(--gx-border)', background: 'var(--gx-surface)',
          }}>
            <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontSize: 12, lineHeight: 1.45, color: 'var(--gx-text)' }}>
              {warning.message}
            </span>
            <button
              type="button"
              onClick={() => onMove(warning.taskId)}
              className="gx-btn gx-btn-secondary"
              style={{ flexShrink: 0, padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
              aria-label={`Move ${warning.taskName} after predecessors`}
            >
              Move after predecessors
            </button>
          </div>
        ))}
      </div>
    </details>
  )
}

