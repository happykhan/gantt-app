import { useEffect, useState } from 'react'
import Modal from './Modal'

const CATEGORY_COLOURS = ['#6366f1', '#0d9488', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16']

function useDesktopEditor() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const onChange = event => setIsDesktop(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

export default function TaskEditorDialog({ task, tasks = [], categories, categoryColors = {}, onUpdate, onDelete, onClose, onMoveUp, onMoveDown }) {
  const [name, setName] = useState(task?.name || '')
  const [start, setStart] = useState(task?.start || '')
  const [end, setEnd] = useState(task?.end || '')
  const [category, setCategory] = useState(task?.category || '')
  const [progress, setProgress] = useState(task?.progress ?? 0)
  const [taskColour, setTaskColour] = useState(task?.color || '')
  const [categoryColourDraft, setCategoryColourDraft] = useState(() => {
    const categoryIndex = categories.indexOf(task?.category)
    return (task?.category && categoryColors[task.category]) || (categoryIndex >= 0 ? CATEGORY_COLOURS[categoryIndex % CATEGORY_COLOURS.length] : '#94a3b8')
  })
  const [dependencies, setDependencies] = useState(() => new Set(task?.dependencies ? task.dependencies.split(',').map(value => value.trim()).filter(Boolean) : []))
  const isDesktop = useDesktopEditor()

  if (!task) return null
  const categoryIndex = categories.indexOf(category)
  const categoryColour = category === task.category
    ? categoryColourDraft
    : (category && categoryColors[category]) || (categoryIndex >= 0 ? CATEGORY_COLOURS[categoryIndex % CATEGORY_COLOURS.length] : '#94a3b8')
  const otherTasks = tasks.filter(candidate => candidate.id !== task.id)

  function save() {
    const accepted = onUpdate(task.id, {
      name,
      start,
      end: end >= start ? end : start,
      category,
      progress,
      dependencies: [...dependencies].join(', '),
      color: taskColour || undefined,
    }, category ? { category, colour: categoryColour } : null)
    if (accepted !== false) onClose()
  }

  return (
    <Modal
      titleId="task-editor-title"
      onClose={onClose}
      backdropZIndex={150}
      dialogZIndex={151}
      className={`task-editor${isDesktop ? ' is-desktop' : ''}`}
    >
        {!isDesktop && <div className="task-editor-drag-handle"><span /></div>}
        <div className="task-editor-content">
          <header className="dialog-header">
            <h3 id="task-editor-title">Edit task</h3>
            <button aria-label="Close task editor" onClick={onClose} className="dialog-close">×</button>
          </header>

          <label className="editor-field"><span>Task name</span><input data-dialog-initial-focus type="text" aria-label="Task name" value={name} onChange={event => setName(event.target.value)} placeholder="Enter task name" /></label>
          <div className="editor-date-grid">
            <label className="editor-field"><span>Start</span><input aria-label="Start date" type="date" value={start} onChange={event => setStart(event.target.value)} /></label>
            <label className="editor-field"><span>End</span><input aria-label="End date" type="date" value={end} min={start} onChange={event => setEnd(event.target.value)} /></label>
          </div>

          <label className="editor-field">
            <span>Category</span>
            <div className="category-input">
              <label className="colour-picker" title="Change category colour">
                <i style={{ backgroundColor: categoryColour }} />
                <input type="color" value={categoryColour} onChange={event => setCategoryColourDraft(event.target.value)} />
              </label>
              <input type="text" aria-label="Category" value={category} list="editor-categories" onChange={event => setCategory(event.target.value)} placeholder="WP1, WP2…" />
              <datalist id="editor-categories">{categories.map(value => <option key={value} value={value} />)}</datalist>
            </div>
            <small>Select the colour swatch to change the WP colour</small>
          </label>

          <label className="editor-field"><span>Progress: {progress}%</span><input type="range" aria-label="Progress" min={0} max={100} step={5} value={progress} onChange={event => setProgress(Number(event.target.value))} /></label>

          <div className="editor-field">
            <span>Task colour</span>
            <div className="task-colour-row">
              <label className="task-colour-picker">
                <i style={{ backgroundColor: taskColour || categoryColour }} />
                <input type="color" value={taskColour || categoryColour} onChange={event => setTaskColour(event.target.value)} />
                <span>{taskColour ? 'Custom' : 'From category'}</span>
              </label>
              {taskColour && <button onClick={() => setTaskColour('')}>Reset</button>}
            </div>
          </div>

          {otherTasks.length > 0 && (
            <fieldset className="editor-field dependency-list">
              <legend>Depends on</legend>
              {otherTasks.map(candidate => (
                <label key={candidate.id}>
                  <input type="checkbox" checked={dependencies.has(candidate.id)} onChange={event => setDependencies(current => {
                    const next = new Set(current)
                    if (event.target.checked) next.add(candidate.id)
                    else next.delete(candidate.id)
                    return next
                  })} />
                  <span title={candidate.name}>{candidate.name}</span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="editor-reorder">
            <button onClick={onMoveUp} disabled={!onMoveUp} className="gx-btn gx-btn-secondary" title="Move task up">↑</button>
            <button onClick={onMoveDown} disabled={!onMoveDown} className="gx-btn gx-btn-secondary" title="Move task down">↓</button>
          </div>
          <div className="editor-actions">
            <button onClick={save} className="gx-btn gx-btn-primary">Save task</button>
            <button onClick={() => { onDelete(task.id); onClose() }} className="editor-delete">Delete</button>
          </div>
        </div>
    </Modal>
  )
}
