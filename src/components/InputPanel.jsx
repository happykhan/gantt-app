import { useState } from 'react'
import { FileUpload } from '@genomicx/ui'
import { parseExcelFile, parsePastedText, generateSampleData } from '../utils/parseInput'

const PASTE_PLACEHOLDER = `Paste from Excel or Google Sheets (tab-separated), or CSV:

Task Name\tStart\tEnd\tCategory
Literature review\t2024-01-01\t2024-02-15\tWP1
Data collection\t2024-02-01\t2024-04-30\tWP1
Analysis\t2024-04-15\t2024-07-01\tWP2`

export default function InputPanel({ onLoad }) {
  const [tab, setTab] = useState('upload')
  const [files, setFiles] = useState([])
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState(null)

  function handleFilesChange(newFiles) {
    setError(null)
    setFiles(newFiles)
    const file = newFiles[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const tasks = parseExcelFile(new Uint8Array(e.target.result))
        if (!tasks.length) { setError('No tasks found — check your column headers'); return }
        onLoad(tasks)
      } catch (err) {
        setError('Could not parse file: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handlePaste() {
    setError(null)
    try {
      const tasks = parsePastedText(pasteText)
      if (!tasks.length) { setError('Could not parse any tasks — check your data'); return }
      onLoad(tasks)
    } catch (err) {
      setError('Parse error: ' + err.message)
    }
  }

  const TABS = [
    { id: 'upload', label: 'Upload file' },
    { id: 'paste', label: 'Paste data' },
    { id: 'example', label: 'Try example' },
  ]

  return (
    <div style={{ width: '100%', maxWidth: 600 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--gx-text)', marginBottom: 6 }}>
          Build a Gantt chart
        </h2>
        <p style={{ color: 'var(--gx-text-muted)', fontSize: 15 }}>
          Load your tasks, drag to edit, export for your grant
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--gx-border)',
        marginBottom: 20,
        gap: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(null) }}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--gx-accent)' : '2px solid transparent',
              color: tab === t.id ? 'var(--gx-accent)' : 'var(--gx-text-muted)',
              background: 'none',
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'color var(--gx-transition)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Upload */}
      {tab === 'upload' && (
        <div>
          <FileUpload
            files={files}
            onFilesChange={handleFilesChange}
            multiple={false}
            accept=".xlsx,.xls,.csv"
            label="Drop your Excel or CSV file here"
            hint="Needs columns: Task Name, Start Date, End Date (column names are flexible)"
          />
        </div>
      )}

      {/* Paste */}
      {tab === 'paste' && (
        <div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={PASTE_PLACEHOLDER}
            rows={10}
            style={{
              width: '100%',
              fontFamily: 'var(--gx-font-mono)',
              fontSize: 13,
              border: '1px solid var(--gx-border)',
              borderRadius: 'var(--gx-radius)',
              padding: '10px 12px',
              background: 'var(--gx-surface)',
              color: 'var(--gx-text)',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handlePaste}
            disabled={!pasteText.trim()}
            className="gx-btn gx-btn-primary"
            style={{ marginTop: 10, width: '100%' }}
          >
            Build Gantt chart
          </button>
        </div>
      )}

      {/* Example */}
      {tab === 'example' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ color: 'var(--gx-text-muted)', marginBottom: 20 }}>
            Load a sample grant timeline to see how it works
          </p>
          <button
            onClick={() => onLoad(generateSampleData())}
            className="gx-btn gx-btn-primary"
            style={{ minWidth: 160 }}
          >
            Load example
          </button>
        </div>
      )}

      {error && (
        <div className="gx-alert gx-alert-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  )
}
