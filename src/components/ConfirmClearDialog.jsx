export default function ConfirmClearDialog({ onConfirm, onClose }) {
  return (
    <div className="dialog-layer" role="presentation">
      <div className="dialog-backdrop" onClick={onClose} />
      <section className="app-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="clear-title" aria-describedby="clear-description">
        <h3 id="clear-title">Clear all tasks?</h3>
        <p id="clear-description">This will remove all tasks and the chart title. This cannot be undone.</p>
        <div className="confirm-actions">
          <button onClick={onConfirm} className="danger-button">Clear all</button>
          <button onClick={onClose} className="gx-btn gx-btn-secondary">Cancel</button>
        </div>
      </section>
    </div>
  )
}
