import { useState, useRef } from 'react'
import { parseExcelFile, parsePastedText, generateSampleData } from '../utils/parseInput'

const PASTE_PLACEHOLDER = `Paste spreadsheet data here (CSV or copy from Excel/Google Sheets)

Example:
Task Name\tStart\tEnd\tCategory
Literature review\t2024-01-01\t2024-02-15\tWP1
Data collection\t2024-02-01\t2024-04-30\tWP1
Analysis\t2024-04-15\t2024-07-01\tWP2`

export default function InputPanel({ onLoad }) {
  const [tab, setTab] = useState('upload')
  const [pasteText, setPasteText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  function handleFile(file) {
    setError(null)
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

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gantt Chart Builder</h1>
        <p className="text-gray-500">Load your data, drag to edit, export for your grant</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { id: 'upload', label: 'Upload file' },
          { id: 'paste', label: 'Paste data' },
          { id: 'example', label: 'Try example' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(null) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Upload */}
      {tab === 'upload' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
          >
            <div className="text-4xl mb-3">📊</div>
            <p className="font-medium text-gray-700 mb-1">Drop your file here or click to browse</p>
            <p className="text-sm text-gray-400">Excel (.xlsx, .xls) or CSV</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500">
            <strong className="text-gray-700">Expected columns:</strong> Task Name, Start Date, End Date, Category (optional)
            — column names are flexible, it will try to match them automatically.
          </div>
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
            className="w-full font-mono text-sm border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
          />
          <button
            onClick={handlePaste}
            disabled={!pasteText.trim()}
            className="mt-3 w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Build Gantt chart
          </button>
        </div>
      )}

      {/* Example */}
      {tab === 'example' && (
        <div className="text-center py-6">
          <p className="text-gray-600 mb-6">Load a sample grant timeline to see how it works</p>
          <button
            onClick={() => onLoad(generateSampleData())}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Load example
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
