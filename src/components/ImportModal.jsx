import { useState } from 'react'
import { FileUpload } from '@genomicx/ui'
import { parseExcelFile, parsePastedText } from '../utils/parseInput'
import Modal from './Modal'
import { parseProjectText } from '../utils/projectSchema'

const PASTE_PLACEHOLDER = `Paste from Excel or Google Sheets (tab-separated), or CSV:

Task ID\tTask Name\tStart\tEnd\tCategory
study\tStudy, design\t03/04/2026\t30/06/2026\tWP1`

function makeTablePreview(result) {
  return {
    kind: 'table',
    project: { title: '', tasks: result.tasks, categoryColors: result.categoryColors },
    errors: result.errors,
  }
}

function ErrorList({ errors }) {
  if (!errors.length) return null
  return (
    <div className="gx-alert gx-alert-error" style={{ marginTop: 12 }} role="alert">
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Fix {errors.length} import {errors.length === 1 ? 'error' : 'errors'}</div>
      <ul style={{ margin: 0, paddingLeft: 20, maxHeight: 150, overflowY: 'auto' }}>
        {errors.map((item, index) => (
          <li key={`${item.row}-${item.field}-${index}`} style={{ marginBottom: 3 }}>
            {item.row != null ? `Row ${item.row}, ` : ''}{item.field}: {item.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Preview({ preview, onConfirm }) {
  if (!preview) return null
  const tasks = preview.project?.tasks || []
  const hasErrors = preview.errors.length > 0
  const colours = Object.keys(preview.project?.categoryColors || {}).length

  return (
    <div style={{ marginTop: 16, border: '1px solid var(--gx-border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: 'var(--gx-bg-alt)', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <strong style={{ fontSize: 13, color: 'var(--gx-text)' }}>Import preview</strong>
        <span style={{ fontSize: 12, color: 'var(--gx-text-muted)' }}>
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}{preview.kind === 'project' ? `, ${colours} colours` : ''}
        </span>
      </div>
      {preview.kind === 'project' && (
        <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--gx-text-muted)', borderTop: '1px solid var(--gx-border)' }}>
          Project title: {preview.project?.title ? `“${preview.project.title}”` : '(empty)'}
        </div>
      )}
      {tasks.length > 0 && (
        <div style={{ overflowX: 'auto', maxHeight: 180, overflowY: 'auto', borderTop: '1px solid var(--gx-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>{['ID', 'Task', 'Start', 'End'].map(column => <th key={column} style={{ textAlign: 'left', padding: '7px 9px', color: 'var(--gx-text-muted)' }}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => (
                <tr key={`${task.id}-${index}`} style={{ borderTop: '1px solid var(--gx-border)' }}>
                  <td style={{ padding: '7px 9px', color: 'var(--gx-text-muted)' }}>{task.id}</td>
                  <td style={{ padding: '7px 9px', color: 'var(--gx-text)' }}>{task.name || '(empty)'}</td>
                  <td style={{ padding: '7px 9px', color: 'var(--gx-text-muted)' }}>{task.start}</td>
                  <td style={{ padding: '7px 9px', color: 'var(--gx-text-muted)' }}>{task.end}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ padding: 10, borderTop: '1px solid var(--gx-border)' }}>
        <button onClick={onConfirm} disabled={hasErrors || !preview.project}
          className="gx-btn gx-btn-primary" style={{ width: '100%' }}>
          {hasErrors ? 'Resolve errors before importing' : `Import ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
        </button>
      </div>
    </div>
  )
}

export default function ImportModal({ onLoad, onClose }) {
  const [tab, setTab] = useState('paste')
  const [files, setFiles] = useState([])
  const [pasteText, setPasteText] = useState('')
  const [preview, setPreview] = useState(null)
  const [fileError, setFileError] = useState(null)

  function setProjectPreview(text) {
    const result = parseProjectText(text)
    setPreview({ kind: 'project', ...result })
  }

  function handleFilesChange(newFiles) {
    setFileError(null)
    setPreview(null)
    setFiles(newFiles)
    const file = newFiles[0]
    if (!file) return

    const reader = new FileReader()
    reader.onerror = () => setFileError('Could not read the selected file.')
    if (file.name.toLowerCase().endsWith('.json')) {
      reader.onload = event => setProjectPreview(event.target.result)
      reader.readAsText(file)
      return
    }

    reader.onload = event => {
      try {
        setPreview(makeTablePreview(parseExcelFile(new Uint8Array(event.target.result))))
      } catch (caught) {
        setFileError(`Could not parse file: ${caught instanceof Error ? caught.message : 'unknown error'}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handlePaste() {
    setFileError(null)
    setPreview(makeTablePreview(parsePastedText(pasteText)))
  }

  function confirmImport() {
    if (!preview?.project || preview.errors.length) return
    if (onLoad({ kind: preview.kind, project: preview.project }) !== false) onClose()
  }

  return (
    <Modal
      titleId="import-title"
      descriptionId="import-description"
      onClose={onClose}
      backdropZIndex={100}
      dialogZIndex={101}
      style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--gx-surface)', borderRadius: 12, padding: 24,
        width: 'min(92vw, 620px)', maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 id="import-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--gx-text)' }}>Import tasks</h3>
          <button aria-label="Close import" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: 'var(--gx-text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <p id="import-description" className="sr-only">Import tasks by pasting spreadsheet data or uploading a supported file.</p>

        <div role="tablist" aria-label="Import method" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--gx-border)', marginBottom: 20 }}>
          {['paste', 'file'].map(item => (
            <button key={item} role="tab" aria-selected={tab === item} aria-controls={`import-${item}-panel`}
              onClick={() => { setTab(item); setPreview(null); setFileError(null) }}
              style={{ padding: '8px 16px', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', background: 'none',
                borderBottom: tab === item ? '2px solid var(--gx-accent)' : '2px solid transparent',
                color: tab === item ? 'var(--gx-accent)' : 'var(--gx-text-muted)', marginBottom: -1 }}>
              {item === 'paste' ? 'Paste data' : 'Upload file'}
            </button>
          ))}
        </div>

        {tab === 'paste' && (
          <div id="import-paste-panel" role="tabpanel">
            <textarea aria-label="Task data to import" data-dialog-initial-focus value={pasteText}
              onChange={event => { setPasteText(event.target.value); setPreview(null) }}
              placeholder={PASTE_PLACEHOLDER} rows={8}
              style={{ width: '100%', fontFamily: 'var(--gx-font-mono)', fontSize: 12,
                border: '1px solid var(--gx-border)', borderRadius: 6, padding: '10px 12px',
                background: 'var(--gx-bg)', color: 'var(--gx-text)', resize: 'vertical',
                outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={handlePaste} disabled={!pasteText.trim()}
              className="gx-btn gx-btn-secondary" style={{ marginTop: 10, width: '100%' }}>
              Preview import
            </button>
          </div>
        )}

        {tab === 'file' && (
          <div id="import-file-panel" role="tabpanel">
            <FileUpload files={files} onFilesChange={handleFilesChange} multiple={false}
              accept=".xlsx,.xls,.csv,.tsv,.json"
              label="Drop Excel, CSV, TSV or .json project file"
              hint="Nothing is replaced until the preview is valid and confirmed" />
          </div>
        )}

        {fileError && <div className="gx-alert gx-alert-error" style={{ marginTop: 12 }} role="alert">{fileError}</div>}
        <ErrorList errors={preview?.errors || []} />
        <Preview preview={preview} onConfirm={confirmImport} />

        <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--gx-bg-alt)', borderRadius: 8, border: '1px solid var(--gx-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Date and column rules</div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--gx-text-muted)', lineHeight: 1.55 }}>
            Required columns are Task Name, Start and End. Dates must use ISO YYYY-MM-DD or British DD/MM/YYYY. Optional columns are Task ID, Category, Progress, Dependencies and Colour. Dependencies may use an ID, row number or unique task name.
          </p>
        </div>
    </Modal>
  )
}
