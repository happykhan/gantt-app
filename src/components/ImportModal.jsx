import { useState } from 'react'
import { FileUpload } from '@genomicx/ui'
import { parseExcelFile, parsePastedText } from '../utils/parseInput'

const PASTE_PLACEHOLDER = `Paste from Excel or Google Sheets (tab-separated), or CSV:

Task Name\tStart\tEnd\tCategory
WP1 Study design\t2024-01-01\t2024-03-01\tWP1
WP2 Data collection\t2024-02-01\t2024-06-01\tWP2`

export default function ImportModal({ onLoad, onClose }) {
  const [tab, setTab] = useState('paste')
  const [files, setFiles] = useState([])
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState(null)

  function handleFilesChange(newFiles) {
    setError(null)
    setFiles(newFiles)
    const file = newFiles[0]
    if (!file) return
    if (file.name.endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const { tasks } = JSON.parse(e.target.result)
          if (Array.isArray(tasks) && tasks.length) { onLoad(tasks); onClose(); return }
          setError('No tasks found in JSON file')
        } catch { setError('Could not parse JSON file') }
      }
      reader.readAsText(file)
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const tasks = parseExcelFile(new Uint8Array(e.target.result))
        if (!tasks.length) { setError('No tasks found — check column headers'); return }
        onLoad(tasks); onClose()
      } catch (err) { setError('Could not parse file: ' + err.message) }
    }
    reader.readAsArrayBuffer(file)
  }

  function handlePaste() {
    setError(null)
    try {
      const tasks = parsePastedText(pasteText)
      if (!tasks.length) { setError('Could not parse any tasks'); return }
      onLoad(tasks); onClose()
    } catch (err) { setError('Parse error: ' + err.message) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--gx-surface)', borderRadius: 12, padding: 24,
        width: 'min(92vw, 540px)', maxHeight: '85vh', overflowY: 'auto',
        zIndex: 101, boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--gx-text)' }}>Import tasks</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: 'var(--gx-text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--gx-border)', marginBottom: 20 }}>
          {['paste','file'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(null) }}
              style={{ padding: '8px 16px', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', background: 'none',
                borderBottom: tab === t ? '2px solid var(--gx-accent)' : '2px solid transparent',
                color: tab === t ? 'var(--gx-accent)' : 'var(--gx-text-muted)', marginBottom: -1 }}>
              {t === 'paste' ? 'Paste data' : 'Upload file'}
            </button>
          ))}
        </div>

        {tab === 'paste' && (
          <div>
            <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
              placeholder={PASTE_PLACEHOLDER} rows={8}
              style={{ width: '100%', fontFamily: 'var(--gx-font-mono)', fontSize: 12,
                border: '1px solid var(--gx-border)', borderRadius: 6, padding: '10px 12px',
                background: 'var(--gx-bg)', color: 'var(--gx-text)', resize: 'vertical',
                outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={handlePaste} disabled={!pasteText.trim()}
              className="gx-btn gx-btn-primary" style={{ marginTop: 10, width: '100%' }}>
              Import
            </button>
          </div>
        )}

        {tab === 'file' && (
          <FileUpload files={files} onFilesChange={handleFilesChange} multiple={false}
            accept=".xlsx,.xls,.csv,.json"
            label="Drop Excel, CSV, or .json project file"
            hint="Columns: Task Name, Start Date, End Date (names are flexible)" />
        )}

        {error && <div className="gx-alert gx-alert-error" style={{ marginTop: 12 }}>{error}</div>}
      </div>
    </>
  )
}
