import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { NavBar } from '@genomicx/ui'
import ConfirmClearDialog from './components/ConfirmClearDialog'
import GanttWorkspace from './components/GanttWorkspace'
import HelpDialog from './components/HelpDialog'
import ImportModal from './components/ImportModal'
import ProjectToolbar from './components/ProjectToolbar'
import SettingsDialog from './components/SettingsDialog'
import TaskEditorDialog from './components/TaskEditorDialog'
import { coloursForCategories } from './config/palettes'
import { useChartExport } from './hooks/useChartExport'
import { useFeedback } from './hooks/useFeedback'
import { useProjectState } from './hooks/useProjectState'
import { useStoredPreference } from './hooks/useStoredPreference'
import { useViewport } from './hooks/useViewport'
import {
  EMPTY_PROJECT,
  addDays,
  createTask,
  deleteTask,
  getCategories,
  moveTask,
  renameCategory,
  renameCategoryColour,
  updateTask,
  withTaskIds,
} from './model/project'
import { downloadProject, readProjectFile } from './services/projectPersistence'
import { generateSampleData } from './utils/parseInput'
import { chooseResponsiveViewMode, clampZoom } from './utils/viewDefaults'

const ROW_HEIGHTS = { compact: 34, normal: 52, spacious: 68 }

function AppIcon() {
  return (
    <svg viewBox="0 0 64 64" className="app-icon" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#0f172a" />
      {[20, 36, 52].map(x => <line key={x} x1={x} y1="10" x2={x} y2="54" stroke="#fff" strokeOpacity="0.08" strokeWidth="1" />)}
      <rect x="12" y="13" width="26" height="7" rx="2" fill="#0d9488" />
      <rect x="20" y="24" width="32" height="7" rx="2" fill="#0d9488" opacity="0.7" />
      <rect x="30" y="35" width="22" height="7" rx="2" fill="#6366f1" />
      <rect x="38" y="46" width="14" height="7" rx="2" fill="#f59e0b" />
      <line x1="36" y1="10" x2="36" y2="54" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="3 2" />
    </svg>
  )
}

function GanttPage({ project, setProject, setTasks, setChartTitle, setCategoryColors, undo, canUndo, autosaveStatus }) {
  const { tasks, chartTitle, categoryColors } = project
  const { width: viewportWidth, isMobile } = useViewport()
  const [viewMode, setViewMode] = useStoredPreference('gantt-viewMode', chooseResponsiveViewMode(tasks, viewportWidth))
  const [labelMode, setLabelMode] = useStoredPreference('gantt-labelMode', 'inline')
  const [displayDensity, setDisplayDensity] = useStoredPreference('gantt-density', 'normal')
  const [zoom, setZoom] = useStoredPreference('gantt-zoom', 1, value => parseFloat(value) || 1)
  const [chartFont, setChartFont] = useStoredPreference('gantt-font', 'inherit')
  const [chartFontSize, setChartFontSize] = useStoredPreference('gantt-fontsize', 11, value => parseInt(value, 10) || 11)
  const [exportScale, setExportScale] = useStoredPreference('gantt-exportScale', 2, value => parseInt(value, 10) || 2)
  const [showTable, setShowTable] = useState(() => window.innerWidth >= 900)
  const [selectedId, setSelectedId] = useState(null)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [activeDialog, setActiveDialog] = useState(null)
  const exportRef = useRef(null)
  const scrollRef = useRef(null)
  const categories = useMemo(() => getCategories(tasks), [tasks])
  const selectedTask = tasks.find(task => task.id === selectedId)
  const editingTask = tasks.find(task => task.id === editingTaskId)
  const { feedback, notify } = useFeedback()
  const { exportPng, exportSvg, exportPdf } = useChartExport({ exportRef, chartTitle, chartFont, exportScale, notify })

  const handleTaskChange = useCallback((taskId, changes) => {
    setTasks(current => updateTask(current, taskId, changes))
  }, [setTasks])

  const handleDelete = useCallback(taskId => {
    setTasks(current => deleteTask(current, taskId))
    setSelectedId(current => current === taskId ? null : current)
    setEditingTaskId(current => current === taskId ? null : current)
  }, [setTasks])

  const handleMove = useCallback((taskId, direction) => {
    setTasks(current => moveTask(current, taskId, direction))
  }, [setTasks])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.target.closest('input, textarea, select, button, [role="menu"], [role="dialog"]')) return
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        undo()
        event.preventDefault()
        return
      }
      if (!selectedId) return
      if (event.key === 'Delete' || event.key === 'Backspace') {
        handleDelete(selectedId)
        event.preventDefault()
      }
      else if (event.key === 'Escape') setSelectedId(null)
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const direction = event.key === 'ArrowLeft' ? -1 : 1
        const days = direction * (event.shiftKey ? 7 : 1)
        setTasks(current => current.map(task => task.id === selectedId ? { ...task, start: addDays(task.start, days), end: addDays(task.end, days) } : task))
        event.preventDefault()
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        setTasks(current => moveTask(current, selectedId, event.key === 'ArrowUp' ? -1 : 1))
        event.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleDelete, selectedId, setTasks, undo])

  function handleAdd() {
    const task = createTask(tasks)
    setTasks(current => [...current, task])
    setSelectedId(task.id)
    setEditingTaskId(task.id)
  }

  function handleImport({ kind, project: importedProject }) {
    const nextTasks = withTaskIds(importedProject.tasks)
    setProject(current => ({
      tasks: nextTasks,
      chartTitle: kind === 'project' ? importedProject.title : current.chartTitle,
      categoryColors: importedProject.categoryColors,
    }))
    setViewMode(chooseResponsiveViewMode(nextTasks, viewportWidth))
    setShowTable(viewportWidth >= 600)
    notify(`Imported ${nextTasks.length} ${nextTasks.length === 1 ? 'task' : 'tasks'}`)
  }

  function handleExample() {
    const sample = withTaskIds(generateSampleData())
    setTasks(sample)
    setViewMode(chooseResponsiveViewMode(sample, viewportWidth))
  }

  function handleClear() {
    setProject({ ...EMPTY_PROJECT, tasks: [], categoryColors: {} })
    setSelectedId(null)
    setEditingTaskId(null)
    setActiveDialog(null)
  }

  async function handleOpenProject(file) {
    if (!file) return
    try {
      const loaded = await readProjectFile(file)
      setProject(loaded)
      setViewMode(chooseResponsiveViewMode(loaded.tasks, viewportWidth))
      notify(`Project loaded with ${loaded.tasks.length} tasks`)
    } catch {
      notify('That project file could not be loaded', 'error')
    }
  }

  function handleRenameCategory(oldCategory, newCategory) {
    setProject(current => ({
      ...current,
      tasks: renameCategory(current.tasks, oldCategory, newCategory),
      categoryColors: renameCategoryColour(current.categoryColors, oldCategory, newCategory),
    }))
  }

  function fitProject() {
    const scroller = scrollRef.current
    if (!scroller?.scrollWidth || !scroller.clientWidth) return
    setZoom(clampZoom((scroller.clientWidth - 8) / scroller.scrollWidth, 0.4, 2))
    scroller.scrollTo?.({ left: 0, top: 0, behavior: 'smooth' })
    notify('Project fitted to the available width')
  }

  function resetZoom() {
    setZoom(1)
    scrollRef.current?.scrollTo?.({ left: 0, top: 0, behavior: 'smooth' })
    notify('Zoom reset to 100%')
  }

  function editTask(taskId) {
    setSelectedId(taskId)
    setEditingTaskId(taskId)
  }

  return (
    <div className="gantt-page">
      <ProjectToolbar
        hasTasks={tasks.length > 0}
        hasSelection={Boolean(selectedTask)}
        selectedTaskName={selectedTask?.name}
        showTable={showTable}
        canUndo={canUndo}
        viewMode={viewMode}
        labelMode={labelMode}
        zoom={zoom}
        onAdd={handleAdd}
        onImport={() => setActiveDialog('import')}
        onToggleTable={() => setShowTable(value => !value)}
        onEditDependencies={() => selectedId ? setEditingTaskId(selectedId) : notify('Select a task to add dependencies', 'progress')}
        onUndo={undo}
        onViewMode={setViewMode}
        onFit={fitProject}
        onResetZoom={resetZoom}
        onZoom={change => setZoom(value => clampZoom(value + change, 0.4, 2))}
        onToggleLabels={() => setLabelMode(mode => mode === 'inline' ? 'classic' : 'inline')}
        onSettings={() => setActiveDialog('settings')}
        onSaveProject={() => { downloadProject(project); notify('Project file saved') }}
        onOpenProject={handleOpenProject}
        onHelp={() => setActiveDialog('help')}
        onClear={() => setActiveDialog('clear')}
        onExportPng={exportPng}
        onExportSvg={exportSvg}
        onExportPdf={exportPdf}
      />

      <GanttWorkspace
        tasks={tasks}
        categories={categories}
        chartTitle={chartTitle}
        onChartTitle={setChartTitle}
        selectedTask={selectedTask}
        selectedId={selectedId}
        isMobile={isMobile}
        viewportWidth={viewportWidth}
        showTable={showTable}
        zoom={zoom}
        viewMode={viewMode}
        labelMode={labelMode}
        rowHeight={ROW_HEIGHTS[displayDensity] || ROW_HEIGHTS.normal}
        barFontSize={chartFontSize}
        chartFont={chartFont}
        categoryColors={categoryColors}
        exportRef={exportRef}
        scrollRef={scrollRef}
        onCreate={handleAdd}
        onExample={handleExample}
        onImport={() => setActiveDialog('import')}
        onColour={(category, colour) => setCategoryColors(current => ({ ...current, [category]: colour }))}
        onTaskChange={handleTaskChange}
        onTaskClick={editTask}
        onTaskSelect={setSelectedId}
        onRenameCategory={handleRenameCategory}
        onDelete={handleDelete}
        onMove={handleMove}
        onEdit={editTask}
      />

      {(feedback || autosaveStatus === 'saving') && (
        <div className={`workflow-feedback ${feedback?.tone || 'progress'}`} role="status" aria-live="polite">
          <span className="feedback-dot" />{feedback?.message || 'Saving changes…'}
        </div>
      )}
      {activeDialog === 'import' && <ImportModal onLoad={handleImport} onClose={() => setActiveDialog(null)} />}
      {activeDialog === 'clear' && <ConfirmClearDialog onConfirm={handleClear} onClose={() => setActiveDialog(null)} />}
      {activeDialog === 'settings' && (
        <SettingsDialog
          density={displayDensity} onDensity={setDisplayDensity}
          chartFont={chartFont} onChartFont={setChartFont}
          fontSize={chartFontSize} onFontSize={setChartFontSize}
          exportScale={exportScale} onExportScale={setExportScale}
          onPalette={name => {
            const colours = coloursForCategories(categories, name)
            if (colours) setCategoryColors(colours)
          }}
          onClose={() => setActiveDialog(null)}
        />
      )}
      {activeDialog === 'help' && <HelpDialog onClose={() => setActiveDialog(null)} />}
      {editingTask && (
        <TaskEditorDialog
          key={editingTask.id}
          task={editingTask}
          tasks={tasks}
          categories={categories}
          categoryColors={categoryColors}
          onColorChange={(category, colour) => setCategoryColors(current => ({ ...current, [category]: colour }))}
          onUpdate={handleTaskChange}
          onDelete={handleDelete}
          onClose={() => setEditingTaskId(null)}
          onMoveUp={tasks.indexOf(editingTask) > 0 ? () => handleMove(editingTaskId, -1) : null}
          onMoveDown={tasks.indexOf(editingTask) < tasks.length - 1 ? () => handleMove(editingTaskId, 1) : null}
        />
      )}
    </div>
  )
}

function App() {
  const projectState = useProjectState()
  const { autosaveStatus } = projectState
  return (
    <BrowserRouter>
      <div className="app-root">
        <NavBar appName="Gantt Builder" appSubtitle="Grant timeline maker" githubUrl="https://github.com/happykhan/gantt-app" icon={<AppIcon />} />
        <GanttPage {...projectState} />
        <footer className="app-footer">
          <span className={`autosave-indicator is-${autosaveStatus}`}><span className="feedback-dot" />{autosaveStatus === 'saving' ? 'Saving…' : autosaveStatus === 'unavailable' ? 'Browser save unavailable' : 'All changes saved in this browser'}</span>
          <span className="app-version">Gantt Builder v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}</span>
          <a href="https://github.com/happykhan/gantt-app" target="_blank" rel="noopener noreferrer">GitHub</a>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
