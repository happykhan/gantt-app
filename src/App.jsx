import { useState, useRef } from 'react'
import InputPanel from './components/InputPanel'
import GanttChart from './components/GanttChart'
import TaskEditor from './components/TaskEditor'

const VIEW_MODES = ['Day', 'Week', 'Month', 'Quarter Year', 'Half Year', 'Year']

let idCounter = 0
function makeId() { return `task-${Date.now()}-${++idCounter}` }

export default function App() {
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('input') // 'input' | 'gantt'
  const [viewMode, setViewMode] = useState('Month')
  const [selectedId, setSelectedId] = useState(null)
  const [showDeps, setShowDeps] = useState(null) // task id whose dep panel is open
  const ganttAreaRef = useRef()

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]

  function handleLoad(newTasks) {
    const tasksWithIds = newTasks.map(t => ({ ...t, id: t.id || makeId() }))
    setTasks(tasksWithIds)
    setView('gantt')
    setSelectedId(null)
  }

  function handleTaskChange(id, changes) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
  }

  function handleDelete(id) {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id)
      // Clean up any dependencies pointing to deleted task
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

  function handleTaskClick(id) {
    setSelectedId(id)
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

    // Inject the bar colour CSS inline so it works standalone
    const style = document.createElement('style')
    style.textContent = Array.from(document.styleSheets)
      .flatMap(s => { try { return Array.from(s.cssRules) } catch { return [] } })
      .filter(r => r.cssText?.includes('bar-cat') || r.cssText?.includes('gantt'))
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

  const selectedTask = tasks.find(t => t.id === selectedId)

  if (view === 'input') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <InputPanel onLoad={handleLoad} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white sticky top-0 z-20">
        <button
          onClick={() => setView('input')}
          className="text-gray-500 hover:text-gray-800 text-sm px-2 py-1 rounded hover:bg-gray-100"
        >
          ← Load new data
        </button>
        <span className="text-gray-300 select-none">|</span>
        <span className="font-semibold text-gray-800 text-sm">Gantt Chart</span>

        <div className="flex items-center gap-1 ml-auto">
          {/* View mode buttons */}
          {['Week','Month','Year'].map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === m
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {m}
            </button>
          ))}
          <span className="w-2" />
          <button
            onClick={exportSVG}
            className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded font-medium hover:bg-gray-900 transition-colors"
          >
            Export SVG
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: task table */}
        <aside className="w-80 border-r border-gray-200 flex flex-col bg-white overflow-y-auto shrink-0">
          <TaskEditor
            tasks={tasks}
            categories={categories}
            onUpdate={handleTaskChange}
            onDelete={handleDelete}
            onAdd={handleAdd}
            selectedId={selectedId}
            showDeps={showDeps}
            setShowDeps={setShowDeps}
            onToggleDep={toggleDep}
          />
        </aside>

        {/* Right: gantt */}
        <main className="flex-1 overflow-auto p-4">
          {/* Selected task panel */}
          {selectedTask && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-500 font-medium mb-0.5">Selected task</p>
                <p className="font-semibold text-gray-900 truncate">{selectedTask.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeps(showDeps === selectedTask.id ? null : selectedTask.id)}
                  className="text-xs px-2.5 py-1.5 border border-blue-300 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  {showDeps === selectedTask.id ? 'Hide' : 'Edit'} dependencies
                </button>
                <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>

              {/* Dependency picker */}
              {showDeps === selectedTask.id && (
                <div className="w-full border-t border-blue-200 pt-2 mt-1">
                  <p className="text-xs text-blue-600 mb-1.5 font-medium">"{selectedTask.name}" depends on:</p>
                  <div className="flex flex-wrap gap-2">
                    {tasks.filter(t => t.id !== selectedTask.id).map(t => {
                      const deps = selectedTask.dependencies
                        ? selectedTask.dependencies.split(',').map(s => s.trim()).filter(Boolean)
                        : []
                      const checked = deps.includes(t.id)
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleDep(selectedTask.id, t.id)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            checked
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 text-gray-600 hover:border-blue-400'
                          }`}
                        >
                          {checked && '✓ '}{t.name}
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
              onTaskClick={handleTaskClick}
              selectedId={selectedId}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
