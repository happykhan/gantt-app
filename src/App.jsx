import { useState, useRef, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { NavBar } from '@genomicx/ui'
import { toPng, toSvg } from 'html-to-image'
import CustomGantt from './components/CustomGantt'
import BottomSheet from './components/BottomSheet'
import ImportModal from './components/ImportModal'
import TaskTable from './components/TaskTable'
import { generateSampleData } from './utils/parseInput'

let idCounter = 0
function makeId() { return `task-${Date.now()}-${++idCounter}` }

const LS_KEY = 'gantt-app-v1'

function loadInitial() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (Array.isArray(saved.tasks) && saved.tasks.length)
        return { tasks: saved.tasks, chartTitle: saved.chartTitle || '', categoryColors: saved.categoryColors || {} }
    }
  } catch {}
  return {
    tasks: generateSampleData().map(t => ({ ...t, id: t.id || makeId() })),
    chartTitle: '',
    categoryColors: {},
  }
}

function GanttPage({ tasks, setTasks, chartTitle, setChartTitle, categoryColors, setCategoryColors }) {
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? 'Year' : 'Quarter')
  const [labelMode, setLabelMode] = useState('inline')
  const [selectedId, setSelectedId] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [editingTitle, setEditingTitle] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showTable, setShowTable] = useState(() => window.innerWidth >= 768)
  const ganttAreaRef = useRef()
  const ganttExportRef = useRef()
  const ganttScrollRef = useRef()

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]
  const selectedTask = tasks.find(t => t.id === selectedId)

  // Delete key shortcut
  useEffect(() => {
    function onKeyDown(e) {
      if (!selectedId) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'Delete' || e.key === 'Backspace') handleDelete(selectedId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  function handleColorChange(cat, color) {
    setCategoryColors(prev => ({ ...prev, [cat]: color }))
  }
  function handleRenameCategory(oldCat, newCat) {
    const trimmed = newCat.trim()
    if (!trimmed || trimmed === oldCat) return
    setTasks(prev => prev.map(t => t.category === oldCat ? { ...t, category: trimmed } : t))
    setCategoryColors(prev => {
      const next = { ...prev }
      if (next[oldCat] !== undefined) { next[trimmed] = next[oldCat]; delete next[oldCat] }
      return next
    })
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
  function handleMoveTask(id, dir) {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === id)
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }
  function handleAddNew() {
    const last = tasks[tasks.length - 1]
    const start = last?.end || new Date().toISOString().substring(0, 10)
    const end = new Date(new Date(start).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    const newTask = { id: makeId(), name: 'New task', start, end, category: last?.category || '', dependencies: '', progress: 0 }
    setTasks(prev => [...prev, newTask])
    setSelectedId(newTask.id)
  }
  function handleImport(newTasks) {
    setTasks(newTasks.map(t => ({ ...t, id: t.id || makeId() })))
  }
  function handleClear() {
    setTasks([])
    setChartTitle('')
    setCategoryColors({})
    setSelectedId(null)
    setConfirmClear(false)
  }

  function saveProject() {
    const blob = new Blob([JSON.stringify({ tasks, chartTitle }, null, 2)], { type: 'application/json' })
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
        const { tasks: loaded, chartTitle: loadedTitle } = JSON.parse(e.target.result)
        if (Array.isArray(loaded) && loaded.length) setTasks(loaded)
        if (loadedTitle) setChartTitle(loadedTitle)
      } catch { /* ignore */ }
    }
    reader.readAsText(file)
  }
  async function captureExport(fn, filename) {
    const outer = ganttExportRef.current
    if (!outer) return

    // Find every element inside outer that clips overflow, not just the known refs.
    // This handles both inline and classic layouts without hardcoding specific refs.
    const CLIP = new Set(['hidden', 'auto', 'scroll', 'clip'])
    const clips = [outer, ...outer.querySelectorAll('*')].filter(el => {
      const s = getComputedStyle(el)
      return CLIP.has(s.overflow) || CLIP.has(s.overflowX) || CLIP.has(s.overflowY)
    })

    const saved = clips.map(el => ({
      el,
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
      height: el.style.height,
      maxHeight: el.style.maxHeight,
    }))
    clips.forEach(el => {
      el.style.overflow = 'visible'
      el.style.overflowX = 'visible'
      el.style.overflowY = 'visible'
      el.style.height = 'auto'
      el.style.maxHeight = 'none'
    })

    // Measure full size after expanding
    const w = outer.scrollWidth
    const h = outer.scrollHeight

    try {
      const url = await fn(outer, { backgroundColor: '#ffffff', pixelRatio: 2, width: w, height: h })
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    } catch (e) { console.error(e); alert('Export failed — try zooming to 100% first.') }
    finally {
      saved.forEach(({ el, overflow, overflowX, overflowY, height, maxHeight }) => {
        el.style.overflow = overflow
        el.style.overflowX = overflowX
        el.style.overflowY = overflowY
        el.style.height = height
        el.style.maxHeight = maxHeight
      })
    }
  }
  async function exportPNG() { await captureExport(toPng, 'gantt.png') }
  async function exportSVG() { await captureExport(toSvg, 'gantt.svg') }

  const ZOOM_STEP = 0.25, ZOOM_MIN = 0.5, ZOOM_MAX = 2

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderBottom: '1px solid var(--gx-border)', background: 'var(--gx-surface)', flexShrink: 0, flexWrap: 'wrap' }}>
        {['Week','Month','Quarter','Year'].map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={viewMode === m ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}
            style={{ fontSize: 12, padding: '3px 8px' }}>{m}</button>
        ))}
        <span style={{ width: 4 }} />
        <button onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))} disabled={zoom <= ZOOM_MIN}
          className="gx-btn gx-btn-secondary" style={{ fontSize: 16, padding: '1px 8px', lineHeight: 1 }}>−</button>
        <span style={{ fontSize: 12, color: 'var(--gx-text-muted)', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))} disabled={zoom >= ZOOM_MAX}
          className="gx-btn gx-btn-secondary" style={{ fontSize: 16, padding: '1px 8px', lineHeight: 1 }}>+</button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setLabelMode(m => m === 'inline' ? 'classic' : 'inline')}
          className="gx-btn gx-btn-secondary"
          style={{ fontSize: 12, padding: '3px 8px' }}
          title={labelMode === 'inline' ? 'Switch to classic layout (labels on left)' : 'Switch to inline layout (labels in bars)'}
        >
          {labelMode === 'inline' ? 'Classic' : 'Inline'}
        </button>
        <button onClick={() => setShowTable(s => !s)} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>
          {showTable ? '▲ Table' : '▼ Table'}
        </button>
        <button onClick={() => setShowImport(true)} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>Import</button>
        <button onClick={saveProject} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>Save</button>
        <label className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px', cursor: 'pointer', margin: 0 }}>
          Load<input type="file" accept=".json" style={{ display: 'none' }} onChange={e => { loadProject(e.target.files[0]); e.target.value = '' }} />
        </label>
        <button onClick={exportPNG} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>PNG</button>
        <button onClick={exportSVG} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>SVG</button>
        <button onClick={() => setConfirmClear(true)} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>Clear</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Gantt chart area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
          {/* Chart title */}
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--gx-border)', background: 'var(--gx-surface)', flexShrink: 0 }}>
            {editingTitle ? (
              <input autoFocus value={chartTitle} onChange={e => setChartTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false) }}
                placeholder="Enter chart title…"
                style={{ width: '100%', fontSize: 15, fontWeight: 600, border: 'none', borderBottom: '2px solid var(--gx-accent)', outline: 'none', background: 'transparent', color: 'var(--gx-text)', padding: '2px 0' }} />
            ) : (
              <div onClick={() => setEditingTitle(true)} title="Tap to set chart title"
                style={{ fontSize: 15, fontWeight: 600, color: chartTitle ? 'var(--gx-text)' : 'var(--gx-text-muted)', cursor: 'text', minHeight: 24 }}>
                {chartTitle || 'Tap to add chart title…'}
              </div>
            )}
          </div>

          <div ref={ganttAreaRef} style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${(100/zoom).toFixed(1)}%`, height: `${(100/zoom).toFixed(1)}%` }}>
              <CustomGantt
                tasks={tasks}
                viewMode={viewMode}
                labelMode={labelMode}
                categoryColors={categoryColors}
                onColorChange={handleColorChange}
                onTaskChange={handleTaskChange}
                onTaskClick={id => setSelectedId(prev => prev === id ? null : id)}
                onRenameCategory={handleRenameCategory}
                exportRef={ganttExportRef}
                scrollExportRef={ganttScrollRef}
              />
            </div>
          </div>

          {/* FAB: Add task */}
          <button onClick={handleAddNew}
            style={{
              position: 'absolute', bottom: 20, right: 20,
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--gx-accent)', color: '#fff',
              border: 'none', fontSize: 26, lineHeight: 1, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
            }} title="Add task">+</button>
        </main>

        {/* Task table (collapsible) */}
        {showTable && (
          <div style={{ borderTop: '2px solid var(--gx-border)', flexShrink: 0 }}>
            <TaskTable
              tasks={tasks}
              categories={categories}
              onUpdate={handleTaskChange}
              onDelete={handleDelete}
              onAdd={handleAddNew}
              onMove={handleMoveTask}
            />
          </div>
        )}
      </div>

      {/* Import modal */}
      {showImport && <ImportModal onLoad={handleImport} onClose={() => setShowImport(false)} />}

      {/* Confirm clear modal */}
      {confirmClear && (
        <>
          <div onClick={() => setConfirmClear(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, background: 'var(--gx-surface)', borderRadius: 12, padding: '28px 28px 24px', width: 320, maxWidth: '90vw', boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: 'var(--gx-text)' }}>Clear all tasks?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--gx-text-muted)', lineHeight: 1.5 }}>This will remove all tasks and the chart title. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleClear} style={{ flex: 1, padding: '10px', fontSize: 14, background: 'var(--gx-error)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Clear all</button>
              <button onClick={() => setConfirmClear(false)} className="gx-btn gx-btn-secondary" style={{ flex: 1, padding: '10px', fontSize: 14 }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* Bottom sheet (mobile task editor) */}
      {selectedTask && (
        <BottomSheet
          task={selectedTask}
          tasks={tasks}
          categories={categories}
          onUpdate={handleTaskChange}
          onDelete={handleDelete}
          onClose={() => setSelectedId(null)}
          onMoveUp={tasks.indexOf(selectedTask) > 0 ? () => handleMoveTask(selectedId, -1) : null}
          onMoveDown={tasks.indexOf(selectedTask) < tasks.length - 1 ? () => handleMoveTask(selectedId, 1) : null}
        />
      )}
    </div>
  )
}

function App() {
  const initial = loadInitial()
  const [tasks, setTasks] = useState(initial.tasks)
  const [chartTitle, setChartTitle] = useState(initial.chartTitle)
  const [categoryColors, setCategoryColors] = useState(initial.categoryColors)

  // Autosave
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ tasks, chartTitle, categoryColors }))
    } catch {}
  }, [tasks, chartTitle, categoryColors])

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

        <GanttPage
          tasks={tasks} setTasks={setTasks}
          chartTitle={chartTitle} setChartTitle={setChartTitle}
          categoryColors={categoryColors} setCategoryColors={setCategoryColors}
        />

        <footer style={{ borderTop: '1px solid var(--gx-border)', padding: '6px 16px', fontSize: 12, color: 'var(--gx-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, background: 'var(--gx-surface)', flexShrink: 0 }}>
          <span>Gantt Builder — autosaved in your browser</span>
          <a href="https://github.com/happykhan/gantt-app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gx-accent)', textDecoration: 'none' }}>GitHub</a>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
