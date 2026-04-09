import { useState, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NavBar, AppFooter } from '@genomicx/ui'
import InputPanel from './components/InputPanel'
import GanttChart from './components/GanttChart'
import TaskEditor from './components/TaskEditor'

let idCounter = 0
function makeId() { return `task-${Date.now()}-${++idCounter}` }

function GanttPage({ tasks, setTasks, onReset }) {
  const [viewMode, setViewMode] = useState('Month')
  const [selectedId, setSelectedId] = useState(null)
  const [showDeps, setShowDeps] = useState(null)
  const ganttAreaRef = useRef()

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
          {['Week','Month','Year'].map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={viewMode === m ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}
              style={{ fontSize: 12, padding: '3px 10px' }}
            >
              {m}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={exportSVG}
            className="gx-btn gx-btn-secondary"
            style={{ fontSize: 12, padding: '3px 10px' }}
          >
            Export SVG
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

        <div ref={ganttAreaRef}>
          <GanttChart
            tasks={tasks}
            viewMode={viewMode}
            onTaskChange={handleTaskChange}
            onTaskClick={(id) => { setSelectedId(id); setShowDeps(null) }}
            selectedId={selectedId}
          />
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

        <AppFooter appName="Gantt Builder" />
      </div>
    </BrowserRouter>
  )
}

export default App
