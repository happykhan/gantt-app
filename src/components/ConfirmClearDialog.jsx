import Modal from './Modal'

export default function ConfirmClearDialog({ onConfirm, onClose }) {
  return (
    <Modal
      titleId="clear-title"
      descriptionId="clear-description"
      onClose={onClose}
      backdropZIndex={130}
      dialogZIndex={131}
      role="alertdialog"
      className="app-dialog confirm-dialog"
    >
        <h3 id="clear-title">Clear all tasks?</h3>
        <p id="clear-description">This will remove all tasks, the chart title and project colours. You can undo this action.</p>
        <div className="confirm-actions">
          <button onClick={onConfirm} className="danger-button">Clear all</button>
          <button onClick={onClose} className="gx-btn gx-btn-secondary">Cancel</button>
        </div>
    </Modal>
  )
}
