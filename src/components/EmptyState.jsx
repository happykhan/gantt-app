export default function EmptyState({ onCreate, onExample, onImport }) {
  return (
    <section className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">📊</div>
      <h2>Build your Gantt chart</h2>
      <p>Create a project timeline, edit the details, connect dependencies, then save or export. Everything stays in your browser.</p>
      <div className="empty-state-actions">
        <button onClick={onCreate} className="gx-btn gx-btn-primary">Create first task</button>
        <button onClick={onExample} className="gx-btn gx-btn-secondary">Load example</button>
        <button onClick={onImport} className="gx-btn gx-btn-secondary">Import project data</button>
      </div>
      <small>Start from scratch, an example, or an existing spreadsheet.</small>
    </section>
  )
}
