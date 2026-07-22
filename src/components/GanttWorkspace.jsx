import { useState } from 'react'
import { useStoredPreference } from '../hooks/useStoredPreference'
import CustomGantt from './CustomGantt'
import EmptyState from './EmptyState'
import TaskTable from './TaskTable'

export default function GanttWorkspace({
  tasks,
  categories,
  chartTitle,
  onChartTitle,
  selectedTask,
  selectedId,
  isMobile,
  viewportWidth,
  showTable,
  zoom,
  viewMode,
  labelMode,
  rowHeight,
  barFontSize,
  chartFont,
  categoryColors,
  exportRef,
  scrollRef,
  onCreate,
  onExample,
  onImport,
  onColour,
  onTaskChange,
  onTaskClick,
  onRenameCategory,
  onDelete,
  onMove,
  onEdit,
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [tableHeight, setTableHeight] = useStoredPreference('gantt-tableHeight', 240, value => parseInt(value, 10) || 240)

  function startTableResize(event) {
    const isTouch = event.type === 'touchstart'
    const startY = isTouch ? event.touches[0].clientY : event.clientY
    const startingHeight = tableHeight
    function onMove(moveEvent) {
      const y = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY
      setTableHeight(Math.max(80, Math.min(600, startingHeight - (y - startY))))
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    event.preventDefault()
  }

  return (
    <div className="workspace-shell">
      <main className="chart-workspace">
        <div className="chart-heading">
          {editingTitle ? (
            <input autoFocus value={chartTitle} onChange={event => onChartTitle(event.target.value)} onBlur={() => setEditingTitle(false)} onKeyDown={event => {
              if (event.key === 'Enter' || event.key === 'Escape') setEditingTitle(false)
            }} aria-label="Project title" placeholder="Add project title" className="chart-title-input" />
          ) : (
            <button onClick={() => setEditingTitle(true)} title="Select to set the project title" className={`chart-title-button${chartTitle ? '' : ' is-placeholder'}`}>
              {chartTitle || 'Add project title'}
            </button>
          )}
          {tasks.length > 0 && (
            <span className="chart-heading-hint">
              {selectedTask ? `Selected: ${selectedTask.name}` : isMobile ? 'Tap a task to edit' : 'Select a task to edit dates and dependencies'}
            </span>
          )}
        </div>

        {tasks.length === 0 ? (
          <EmptyState onCreate={onCreate} onExample={onExample} onImport={onImport} />
        ) : (
          <div className="gantt-viewport">
            <div className="gantt-zoom-layer" style={{ transform: `scale(${zoom})`, width: `${(100 / zoom).toFixed(1)}%`, height: `${(100 / zoom).toFixed(1)}%` }}>
              <CustomGantt
                tasks={tasks}
                viewMode={viewMode}
                labelMode={labelMode}
                rowHeight={rowHeight}
                barFontSize={barFontSize}
                chartFont={chartFont}
                categoryColors={categoryColors}
                onColorChange={onColour}
                onTaskChange={onTaskChange}
                onTaskClick={onTaskClick}
                onRenameCategory={onRenameCategory}
                exportRef={exportRef}
                scrollExportRef={scrollRef}
                isMobile={isMobile}
                selectedId={selectedId}
                availableWidth={Math.max(320, viewportWidth - (labelMode === 'classic' ? (isMobile ? 124 : 190) : 16))}
              />
            </div>
          </div>
        )}

        {tasks.length > 0 && <button onClick={onCreate} className="add-task-fab" title="Add task"><span>+</span><span className="fab-label">Task</span></button>}
      </main>

      {showTable && tasks.length > 0 && (
        <section className="task-table-panel">
          <div onMouseDown={startTableResize} onTouchStart={startTableResize} className={`table-resize-handle${isMobile ? ' is-mobile' : ''}`}>
            <span />
          </div>
          <TaskTable
            tasks={tasks}
            categories={categories}
            onUpdate={onTaskChange}
            onDelete={onDelete}
            onAdd={onCreate}
            onMove={onMove}
            tableHeight={tableHeight}
            compact={viewportWidth < 600}
            onEdit={onEdit}
          />
        </section>
      )}
    </div>
  )
}
