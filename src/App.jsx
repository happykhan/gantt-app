import { useState, useRef } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { NavBar } from '@genomicx/ui'
import { toPng } from 'html-to-image'
import InputPanel from './components/InputPanel'
import GanttChart from './components/GanttChart'
import TaskEditor from './components/TaskEditor'

let idCounter = 0
function makeId() { return `task-${Date.now()}-${++idCounter}` }

function GanttPage({ tasks, setTasks, onReset }) {
  const [viewMode, setViewMode] = useState('Month')
  const [selectedId, setSelectedId] = useState(null)
  const [showDeps, setShowDeps] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [categoryColors, setCategoryColors] = useState({})
  const ganttAreaRef = useRef()

  function handleColorChange(cat, color) {
    setCategoryColors(prev => ({ ...prev, [cat]: color }))
  }

  const ZOOM_STEP = 0.25
  const ZOOM_MIN = 0.5
  const ZOOM_MAX = 2

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]
  const selectedTask = tasks.find(t => t.id === selectedId)

  function handleTaskChange(id, changes) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
  }

  function handleDelete(id) {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id)
      return next.map(t => ({
        ...t,
        dependencies: t.dependencies
          ? t.dependencies.split(',').map(s => s.trim()).filter(d => d !== id).join(', ')
          : ''
      }))
    })
    if (selectedId === id) setSelectedId(null)
  }

  function handleAdd(taskData) {
    setTasks(prev => [...prev, { ...taskData, id: makeId() }])
  }

  function toggleDep(taskId, depId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const deps = t.dependencies ? t.dependencies.split(',').map(s => s.trim()).filter(Boolean) : []
      const idx = deps.indexOf(depId)
      const newDeps = idx >= 0 ? deps.filter(d => d !== depId) : [...deps, depId]
      return { ...t, dependencies: newDeps.join(', ') }
    }))
  }

  function exportSVG() {
    const svg = ganttAreaRef.current?.querySelector('svg')
    if (!svg) return
    const clone = svg.cloneNode(true)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const style = document.createElement('style')
    style.textContent = Array.from(document.styleSheets)
      .flatMap(s => { try { return Array.from(s.cssRules) } catch { return [] } })
      .filter(r => r.cssText?.includes('bar-cat') || r.cssText?.includes('.gantt'))
      .map(r => r.cssText)
      .join('\n')
    clone.insertBefore(style, clone.firstChild)
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'gantt.svg'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function saveProject() {
    const blob = new Blob([JSON.stringify({ tasks }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'gantt-project.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function loadProject(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const { tasks: loaded } = JSON.parse(e.target.result)
        if (Array.isArray(loaded) && loaded.length) {
          setTasks(loaded)
        }
      } catch { /* ignore bad files */ }
    }
    reader.readAsText(file)
  }

  async function exportPNG() {
    const el = ganttAreaRef.current
    if (!el) return
    try {
      const dataUrl = await toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'gantt.png'
      a.click()
    } catch (e) {
      console.error('PNG export failed', e)
    }
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'var(--layout-dir, row)' }}
      className="gantt-root">
      <style>{`@media (max-width: 700px) { .gantt-root { --layout-dir: column; } .gantt-aside { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--gx-border) !important; max-height: 280px; } }`}</style>
      {/* Left sidebar: task table */}
      <aside className="gantt-aside" style={{
        width: 320,
        borderRight: '1px solid var(--gx-border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--gx-surface)',
        overflowY: 'auto',
        flexShrink: 0,
      }}>
        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '8px 10px',
          borderBottom: '1px solid var(--gx-border)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          {['Week','Month','Quarter Year','Year'].map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={viewMode === m ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}
              style={{ fontSize: 12, padding: '3px 10px' }}
            >
              {m === 'Quarter Year' ? 'Quarter' : m}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {/* Zoom */}
          <button
            onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoom <= ZOOM_MIN}
            className="gx-btn gx-btn-secondary"
            style={{ fontSize: 16, padding: '1px 8px', lineHeight: 1 }}
            title="Zoom out"
          >−</button>
          <span style={{ fontSize: 12, color: 'var(--gx-text-muted)', minWidth: 36, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoom >= ZOOM_MAX}
            className="gx-btn gx-btn-secondary"
            style={{ fontSize: 16, padding: '1px 8px', lineHeight: 1 }}
            title="Zoom in"
          >+</button>
          <span style={{ width: 4 }} />
          <button
            onClick={saveProject}
            className="gx-btn gx-btn-secondary"
            style={{ fontSize: 12, padding: '3px 10px' }}
            title="Save project as JSON"
          >
            Save
          </button>
          <label
            className="gx-btn gx-btn-secondary"
            style={{ fontSize: 12, padding: '3px 10px', cursor: 'pointer', margin: 0 }}
            title="Load a saved JSON project"
          >
            Load
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => { loadProject(e.target.files[0]); e.target.value = '' }} />
          </label>
          <button
            onClick={exportPNG}
            className="gx-btn gx-btn-secondary"
            style={{ fontSize: 12, padding: '3px 10px' }}
          >
            PNG
          </button>
          <button
            onClick={exportSVG}
            className="gx-btn gx-btn-secondary"
            style={{ fontSize: 12, padding: '3px 10px' }}
          >
            SVG
          </button>
          <button
            onClick={onReset}
            className="gx-btn gx-btn-secondary"
            style={{ fontSize: 12, padding: '3px 10px' }}
            title="Load new data"
          >
            ← New
          </button>
        </div>

        <TaskEditor
          tasks={tasks}
          categories={categories}
          onUpdate={handleTaskChange}
          onDelete={handleDelete}
          onAdd={handleAdd}
          selectedId={selectedId}
        />
      </aside>

      {/* Right: gantt chart */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Dependency editor (shown when task selected) */}
        {selectedTask && (
          <div style={{
            marginBottom: 12,
            padding: 12,
            background: 'var(--gx-accent-dim)',
            border: '1px solid var(--gx-border)',
            borderRadius: 'var(--gx-radius)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: 'var(--gx-accent)', fontWeight: 600, marginBottom: 2 }}>Selected</p>
                <p style={{ fontWeight: 600, color: 'var(--gx-text)' }}>{selectedTask.name}</p>
              </div>
              <button
                onClick={() => setShowDeps(showDeps === selectedTask.id ? null : selectedTask.id)}
                className="gx-btn gx-btn-secondary"
                style={{ fontSize: 12 }}
              >
                {showDeps === selectedTask.id ? 'Hide' : 'Edit'} dependencies
              </button>
              <button onClick={() => { setSelectedId(null); setShowDeps(null) }} style={{ color: 'var(--gx-text-muted)', fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>

            {showDeps === selectedTask.id && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--gx-text-muted)', marginBottom: 8 }}>
                  "{selectedTask.name}" starts after:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tasks.filter(t => t.id !== selectedTask.id).map(t => {
                    const deps = selectedTask.dependencies
                      ? selectedTask.dependencies.split(',').map(s => s.trim()).filter(Boolean)
                      : []
                    const checked = deps.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleDep(selectedTask.id, t.id)}
                        className={checked ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}
                        style={{ fontSize: 12 }}
                      >
                        {checked ? '✓ ' : ''}{t.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ overflow: 'auto', width: '100%' }}>
          <div
            ref={ganttAreaRef}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: `${(100 / zoom).toFixed(1)}%`,
            }}
          >
            <GanttChart
              tasks={tasks}
              viewMode={viewMode}
              onTaskChange={handleTaskChange}
              onTaskClick={(id) => { setSelectedId(id); setShowDeps(null) }}
              selectedId={selectedId}
              categoryColors={categoryColors}
              onColorChange={handleColorChange}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('input') // 'input' | 'gantt'

  function handleLoad(newTasks) {
    const tasksWithIds = newTasks.map(t => ({ ...t, id: t.id || makeId() }))
    setTasks(tasksWithIds)
    setView('gantt')
  }

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gx-bg)' }}>
        <NavBar
          appName="Gantt Builder"
          appSubtitle="Grant timeline maker"
          githubUrl="https://github.com/happykhan/gantt-app"
          icon={
            <svg viewBox="0 0 64 64" style={{ width: 32, height: 32 }}>
              <rect width="64" height="64" rx="12" fill="#0f172a"/>
              <line x1="20" y1="10" x2="20" y2="54" stroke="#fff" strokeOpacity="0.08" strokeWidth="1"/>
              <line x1="36" y1="10" x2="36" y2="54" stroke="#fff" strokeOpacity="0.08" strokeWidth="1"/>
              <line x1="52" y1="10" x2="52" y2="54" stroke="#fff" strokeOpacity="0.08" strokeWidth="1"/>
              <rect x="12" y="13" width="26" height="7" rx="2" fill="#0d9488"/>
              <rect x="20" y="24" width="32" height="7" rx="2" fill="#0d9488" opacity="0.7"/>
              <rect x="30" y="35" width="22" height="7" rx="2" fill="#6366f1"/>
              <rect x="38" y="46" width="14" height="7" rx="2" fill="#f59e0b"/>
              <line x1="36" y1="10" x2="36" y2="54" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="3 2"/>
            </svg>
          }
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {view === 'input' ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <InputPanel onLoad={handleLoad} />
            </div>
          ) : (
            <GanttPage
              tasks={tasks}
              setTasks={setTasks}
              onReset={() => { setView('input'); setTasks([]) }}
            />
          )}
        </div>

        <footer style={{
          borderTop: '1px solid var(--gx-border)',
          padding: '10px 20px',
          fontSize: 12,
          color: 'var(--gx-text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          background: 'var(--gx-surface)',
        }}>
          <span>Gantt Builder — all processing runs locally in your browser</span>
          <a href="https://github.com/happykhan/gantt-app" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--gx-accent)', textDecoration: 'none' }}>
            GitHub
          </a>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
