import { useState, useRef } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { NavBar } from '@genomicx/ui'
import { toPng } from 'html-to-image'
import InputPanel from './components/InputPanel'
import CustomGantt from './components/CustomGantt'
import TaskEditor from './components/TaskEditor'
import BottomSheet from './components/BottomSheet'

let idCounter = 0
function makeId() { return `task-${Date.now()}-${++idCounter}` }

function GanttPage({ tasks, setTasks, onReset }) {
  const [viewMode, setViewMode] = useState('Quarter')
  const [selectedId, setSelectedId] = useState(null)
  const [showDeps, setShowDeps] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [categoryColors, setCategoryColors] = useState({})
  const [showSidebar, setShowSidebar] = useState(false) // mobile sidebar toggle
  const ganttAreaRef = useRef()

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]
  const selectedTask = tasks.find(t => t.id === selectedId)

  function handleColorChange(cat, color) {
    setCategoryColors(prev => ({ ...prev, [cat]: color }))
  }
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
    const newTask = { ...taskData, id: makeId() }
    setTasks(prev => [...prev, newTask])
  }
  function handleAddNew() {
    const last = tasks[tasks.length - 1]
    const start = last?.end || new Date().toISOString().substring(0, 10)
    const end = new Date(new Date(start).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    const newTask = { id: makeId(), name: 'New task', start, end, category: last?.category || '', dependencies: '', progress: 0 }
    setTasks(prev => [...prev, newTask])
    setSelectedId(newTask.id)
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
        if (Array.isArray(loaded) && loaded.length) setTasks(loaded)
      } catch { /* ignore */ }
    }
    reader.readAsText(file)
  }
  async function exportPNG() {
    const el = ganttAreaRef.current
    if (!el) return
    try {
      const url = await toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2 })
      const a = document.createElement('a'); a.href = url; a.download = 'gantt.png'; a.click()
    } catch (e) { console.error(e) }
  }

  const ZOOM_STEP = 0.25, ZOOM_MIN = 0.5, ZOOM_MAX = 2

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderBottom: '1px solid var(--gx-border)', background: 'var(--gx-surface)', flexShrink: 0, flexWrap: 'wrap' }}>
        {/* View modes */}
        {['Week','Month','Quarter','Year'].map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={viewMode === m ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}
            style={{ fontSize: 12, padding: '3px 8px' }}>
            {m}
          </button>
        ))}
        <span style={{ width: 4 }} />
        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))} disabled={zoom <= ZOOM_MIN}
          className="gx-btn gx-btn-secondary" style={{ fontSize: 16, padding: '1px 8px', lineHeight: 1 }}>−</button>
        <span style={{ fontSize: 12, color: 'var(--gx-text-muted)', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))} disabled={zoom >= ZOOM_MAX}
          className="gx-btn gx-btn-secondary" style={{ fontSize: 16, padding: '1px 8px', lineHeight: 1 }}>+</button>
        <div style={{ flex: 1 }} />
        {/* Task list toggle (mobile) */}
        <button onClick={() => setShowSidebar(s => !s)}
          className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}
          title="Show/hide task list">
          ☰ Tasks
        </button>
        <button onClick={saveProject} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>Save</button>
        <label className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px', cursor: 'pointer', margin: 0 }}>
          Load<input type="file" accept=".json" style={{ display: 'none' }} onChange={e => { loadProject(e.target.files[0]); e.target.value = '' }} />
        </label>
        <button onClick={exportPNG} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>PNG</button>
        <button onClick={onReset} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>← New</button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Task sidebar (collapsible on mobile) */}
        {showSidebar && (
          <aside style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--gx-border)', background: 'var(--gx-surface)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Dependency editor */}
            {selectedTask && (
              <div style={{ padding: 10, borderBottom: '1px solid var(--gx-border)', background: 'var(--gx-accent-dim)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gx-accent)', marginBottom: 4, textTransform: 'uppercase' }}>Dependencies for: {selectedTask.name}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {tasks.filter(t => t.id !== selectedId).map(t => {
                    const deps = selectedTask.dependencies ? selectedTask.dependencies.split(',').map(s => s.trim()).filter(Boolean) : []
                    const checked = deps.includes(t.id)
                    return (
                      <button key={t.id} onClick={() => toggleDep(selectedId, t.id)}
                        className={checked ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}
                        style={{ fontSize: 11 }}>
                        {checked ? '✓ ' : ''}{t.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <TaskEditor tasks={tasks} categories={categories} onUpdate={handleTaskChange} onDelete={handleDelete} onAdd={handleAdd} />
          </aside>
        )}

        {/* Gantt chart */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
          <div ref={ganttAreaRef} style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${(100/zoom).toFixed(1)}%`, height: `${(100/zoom).toFixed(1)}%` }}>
              <CustomGantt
                tasks={tasks}
                viewMode={viewMode}
                categoryColors={categoryColors}
                onColorChange={handleColorChange}
                onTaskChange={handleTaskChange}
                onTaskClick={id => setSelectedId(prev => prev === id ? null : id)}
              />
            </div>
          </div>

          {/* FAB: Add task */}
          <button
            onClick={handleAddNew}
            style={{
              position: 'absolute', bottom: 20, right: 20,
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--gx-accent)', color: '#fff',
              border: 'none', fontSize: 26, lineHeight: 1,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
            title="Add task"
          >+</button>
        </main>
      </div>

      {/* Bottom sheet (mobile task editor) */}
      {selectedTask && (
        <BottomSheet
          task={selectedTask}
          categories={categories}
          onUpdate={handleTaskChange}
          onDelete={handleDelete}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function App() {
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('input')

  function handleLoad(newTasks) {
    setTasks(newTasks.map(t => ({ ...t, id: t.id || makeId() })))
    setView('gantt')
  }

  return (
    <BrowserRouter>
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--gx-bg)', overflow: 'hidden' }}>
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

        {view === 'input' ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'auto' }}>
            <InputPanel onLoad={handleLoad} />
          </div>
        ) : (
          <GanttPage tasks={tasks} setTasks={setTasks} onReset={() => { setView('input'); setTasks([]) }} />
        )}

        <footer style={{ borderTop: '1px solid var(--gx-border)', padding: '8px 16px', fontSize: 12, color: 'var(--gx-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, background: 'var(--gx-surface)', flexShrink: 0 }}>
          <span>Gantt Builder — runs locally in your browser</span>
          <a href="https://github.com/happykhan/gantt-app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gx-accent)', textDecoration: 'none' }}>GitHub</a>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
