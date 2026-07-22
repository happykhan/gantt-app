const HELP_SECTIONS = [
  ['Keyboard shortcuts', 'Click a task bar first to select it', [['Delete / Backspace', 'Remove selected task'], ['Escape', 'Deselect task'], ['← →', 'Nudge task ±1 day'], ['Shift + ← →', 'Nudge task ±7 days'], ['↑ ↓', 'Reorder task up / down'], ['Double-click bar', 'Rename task inline']]],
  ['Chart', null, [['Click bar', 'Select task (opens editor on mobile)'], ['Click chart title', 'Edit the chart title'], ['Drag label column edge', 'Resize the task name column'], ['Zoom − / +', 'Shrink or expand the time axis'], ['Week / Month / Quarter / Year', 'Change time scale'], ['Classic / Inline', 'Labels in a column vs. inside bars']]],
  ['Task table', null, [['Click any cell', 'Edit task name, category, or progress'], ['Click date', 'Open date picker'], ['Click Deps cell (✎)', 'Choose predecessor tasks'], ['Drag column header edge', 'Resize column'], ['Drag resize handle', 'Adjust table height'], ['↑ ↓ buttons', 'Reorder tasks']]],
  ['Files', null, [['Autosave', 'Keep changes in this browser'], ['Project → Save', 'Download a portable .json project'], ['Project → Open', 'Restore a saved .json project'], ['Import', 'Load tasks from CSV, Excel or JSON'], ['Export → PNG', 'Raster image for Word / slides'], ['Export → SVG', 'Scalable image for documents'], ['Export → PDF', 'PDF for print and sharing']]],
]

export default function HelpDialog({ onClose }) {
  return (
    <div className="dialog-layer" role="presentation">
      <div className="dialog-backdrop" onClick={onClose} />
      <section className="app-dialog help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <header className="dialog-header">
          <h3 id="help-title">Help &amp; shortcuts</h3>
          <button onClick={onClose} className="dialog-close" aria-label="Close help">×</button>
        </header>
        {HELP_SECTIONS.map(([heading, note, rows]) => (
          <section className="help-section" key={heading}>
            <h4>{heading}</h4>
            {note && <p>{note}</p>}
            <dl>{rows.map(([key, description]) => <div key={key}><dt>{key}</dt><dd>{description}</dd></div>)}</dl>
          </section>
        ))}
        <button onClick={onClose} className="gx-btn gx-btn-secondary dialog-done">Close</button>
      </section>
    </div>
  )
}
