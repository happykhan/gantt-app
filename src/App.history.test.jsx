import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { AUTOSAVE_KEY, SETTINGS_KEY } from './utils/storage'

const initialProject = {
  schemaVersion: 1,
  title: 'Original plan',
  categoryColors: { WP1: '#0d9488', WP2: '#6366f1' },
  tasks: [
    {
      id: 'task-1', name: 'Study design', start: '2026-01-01', end: '2026-02-01',
      category: 'WP1', dependencies: '', progress: 25,
    },
    {
      id: 'task-2', name: 'Analysis', start: '2026-02-02', end: '2026-03-01',
      category: 'WP2', dependencies: '', progress: 0,
    },
  ],
}

function saved() {
  return JSON.parse(localStorage.getItem(AUTOSAVE_KEY))
}

function undo() {
  fireEvent.click(screen.getByTitle('Undo (Ctrl+Z)'))
}

function selectTask(id = 'task-1') {
  const bar = document.querySelector(`[data-testid="gantt-task"][data-task-id="${id}"]`)
  bar.getBoundingClientRect = () => ({ left: 0, width: 100 })
  fireEvent.mouseDown(bar, { button: 0, clientX: 50 })
  fireEvent.mouseUp(window, { clientX: 50 })
  return bar
}

describe('App editor transactions', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(initialProject))
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
  })

  it('cancels title, table and inline drafts consistently with Escape', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit project title: Original plan' }))
    const title = screen.getByRole('textbox', { name: 'Project title' })
    fireEvent.change(title, { target: { value: 'Cancelled title' } })
    fireEvent.keyDown(title, { key: 'Escape' })

    const taskName = screen.getByDisplayValue('Study design')
    fireEvent.focus(taskName)
    fireEvent.change(taskName, { target: { value: 'Cancelled table edit' } })
    fireEvent.keyDown(taskName, { key: 'Escape' })

    const firstBar = document.querySelector('[data-testid="gantt-task"][data-task-id="task-1"]')
    fireEvent.doubleClick(firstBar)
    const inlineInput = firstBar.querySelector('input')
    fireEvent.change(inlineInput, { target: { value: 'Cancelled inline edit' } })
    fireEvent.keyDown(inlineInput, { key: 'Escape' })

    await waitFor(() => expect(saved()).toMatchObject(initialProject))
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeDisabled()
  })

  it('undoes title, table, dependency and category colour actions exactly', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit project title: Original plan' }))
    const title = screen.getByRole('textbox', { name: 'Project title' })
    fireEvent.change(title, { target: { value: 'Changed title' } })
    fireEvent.blur(title)
    await waitFor(() => expect(saved().title).toBe('Changed title'))
    undo()
    await waitFor(() => expect(saved().title).toBe('Original plan'))

    const taskName = screen.getByDisplayValue('Study design')
    fireEvent.focus(taskName)
    fireEvent.change(taskName, { target: { value: 'Table edit' } })
    fireEvent.blur(taskName)
    await waitFor(() => expect(saved().tasks[0].name).toBe('Table edit'))
    undo()
    await waitFor(() => expect(saved().tasks[0].name).toBe('Study design'))

    fireEvent.click(screen.getAllByTitle('Click to set which tasks must finish before this one starts')[0])
    const dependencies = screen.getByRole('heading', { name: 'Dependencies' }).parentElement.parentElement
    fireEvent.click(within(dependencies).getByRole('checkbox', { name: 'Analysis' }))
    fireEvent.click(within(dependencies).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saved().tasks[0].dependencies).toBe('task-2'))
    undo()
    await waitFor(() => expect(saved().tasks[0].dependencies).toBe(''))

    const categoryLabel = screen.getByRole('button', { name: 'WP1' })
    fireEvent.click(categoryLabel)
    const categoryName = document.activeElement
    fireEvent.change(categoryName, { target: { value: 'Research' } })
    fireEvent.blur(categoryName)
    await waitFor(() => {
      expect(saved().tasks[0].category).toBe('Research')
      expect(saved().categoryColors.Research).toBe('#0d9488')
    })
    undo()
    await waitFor(() => expect(saved()).toMatchObject(initialProject))

    const colourPicker = screen.getAllByTitle('Change colour')[0].querySelector('input[type="color"]')
    fireEvent.change(colourPicker, { target: { value: '#ff0000' } })
    await waitFor(() => expect(saved().categoryColors.WP1).toBe('#ff0000'))
    undo()
    await waitFor(() => expect(saved().categoryColors).toEqual(initialProject.categoryColors))

    const taskColour = screen.getAllByTitle('Click to set a custom task colour')[0].querySelector('input[type="color"]')
    fireEvent.change(taskColour, { target: { value: '#123456' } })
    await waitFor(() => expect(saved().tasks[0].color).toBe('#123456'))
    undo()
    await waitFor(() => expect(saved().tasks[0].color).toBeUndefined())
  })

  it('undoes drag, inline, modal and keyboard mutations with one snapshot each', async () => {
    render(<App />)
    const originalTasks = initialProject.tasks

    const bar = document.querySelector('[data-testid="gantt-task"][data-task-id="task-1"]')
    bar.getBoundingClientRect = () => ({ left: 0, width: 100 })
    fireEvent.mouseDown(bar, { button: 0, clientX: 50 })
    fireEvent.mouseUp(window, { clientX: 90 })
    await waitFor(() => expect(saved().tasks[0].start).not.toBe(originalTasks[0].start))
    undo()
    await waitFor(() => expect(saved().tasks).toEqual(originalTasks))

    const resizeBar = document.querySelector('[data-testid="gantt-task"][data-task-id="task-1"]')
    resizeBar.getBoundingClientRect = () => ({ left: 0, width: 100 })
    fireEvent.mouseDown(resizeBar, { button: 0, clientX: 5 })
    fireEvent.mouseUp(window, { clientX: 25 })
    await waitFor(() => {
      expect(saved().tasks[0].start).not.toBe(originalTasks[0].start)
      expect(saved().tasks[0].end).toBe(originalTasks[0].end)
    })
    undo()
    await waitFor(() => expect(saved().tasks).toEqual(originalTasks))

    const inlineBar = document.querySelector('[data-testid="gantt-task"][data-task-id="task-1"]')
    fireEvent.doubleClick(inlineBar)
    const inlineInput = inlineBar.querySelector('input')
    fireEvent.change(inlineInput, { target: { value: 'Inline edit' } })
    fireEvent.blur(inlineInput)
    await waitFor(() => expect(saved().tasks[0].name).toBe('Inline edit'))
    undo()
    await waitFor(() => expect(saved().tasks).toEqual(originalTasks))

    selectTask()
    const editor = screen.getByRole('heading', { name: 'Edit task' }).parentElement.parentElement
    fireEvent.change(editor.querySelector('input[type="text"]'), { target: { value: 'Modal edit' } })
    fireEvent.change(editor.querySelector('input[type="date"]'), { target: { value: '2026-01-05' } })
    fireEvent.change(within(editor).getByRole('slider'), { target: { value: '60' } })
    fireEvent.change(editor.querySelector('input[type="color"]'), { target: { value: '#abcdef' } })
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Analysis' }))
    fireEvent.click(within(editor).getByRole('button', { name: 'Save task' }))
    await waitFor(() => expect(saved().tasks[0]).toMatchObject({
      name: 'Modal edit', start: '2026-01-05', progress: 60, dependencies: 'task-2',
    }))
    expect(saved().categoryColors.WP1).toBe('#abcdef')
    undo()
    await waitFor(() => expect(saved().tasks).toEqual(originalTasks))

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await waitFor(() => expect(saved().tasks[0].start).toBe('2026-01-02'))
    undo()
    await waitFor(() => expect(saved().tasks).toEqual(originalTasks))

    fireEvent.keyDown(window, { key: 'ArrowDown' })
    await waitFor(() => expect(saved().tasks.map(task => task.id)).toEqual(['task-2', 'task-1']))
    undo()
    await waitFor(() => expect(saved().tasks).toEqual(originalTasks))
  })

  it('undoes import, project load and Clear as complete replacements', async () => {
    const { container } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Import' }))
    const importModal = screen.getByRole('heading', { name: 'Import tasks' }).parentElement.parentElement
    fireEvent.change(importModal.querySelector('textarea'), {
      target: { value: 'Task,Start,End\nImported,2026-04-01,2026-05-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Import 1 task' }))
    await waitFor(() => expect(saved().tasks[0].name).toBe('Imported'))
    undo()
    await waitFor(() => expect(saved()).toMatchObject(initialProject))

    fireEvent.click(screen.getByRole('button', { name: 'Project' }))
    const projectInput = container.querySelector('input[type="file"][accept=".json"]')
    const replacement = {
      ...initialProject,
      title: 'Loaded project',
      tasks: [{ ...initialProject.tasks[0], name: 'Loaded task' }],
      categoryColors: { WP1: '#ff0000' },
    }
    fireEvent.change(projectInput, {
      target: { files: [new File([JSON.stringify(replacement)], 'project.json', { type: 'application/json' })] },
    })
    await waitFor(() => expect(saved().title).toBe('Loaded project'))
    fireEvent.keyDown(document, { key: 'Escape' })
    undo()
    await waitFor(() => expect(saved()).toMatchObject(initialProject))

    selectTask()
    fireEvent.click(screen.getByRole('button', { name: 'Project' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clear project' }))
    expect(screen.getByText(/You can undo this action/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    await waitFor(() => expect(saved()).toMatchObject({ tasks: [], title: '', categoryColors: {} }))
    undo()
    await waitFor(() => expect(saved()).toMatchObject(initialProject))
    expect(screen.getByDisplayValue('Study design')).toBeInTheDocument()
  })

  it('restores Month and every consolidated display setting on mobile reload', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      viewMode: 'Month', labelMode: 'classic', zoom: 1.5, displayDensity: 'compact',
      chartFont: 'Arial, sans-serif', chartFontSize: 14, exportScale: 4,
      showTable: true, tableHeight: 320, labelWidth: 220,
      columnWidths: { name: 240, start: 90, end: 90, dur: 60, category: 120, progress: 60, deps: 140 },
    }))
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 })

    const first = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitem', { name: 'Month' })).toHaveClass('is-selected')
    expect(screen.getByRole('menuitem', { name: /Reset zoom/ })).toHaveTextContent('150%')
    first.unmount()

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitem', { name: 'Month' })).toHaveClass('is-selected')
    expect(screen.getByRole('menuitem', { name: /Reset zoom/ })).toHaveTextContent('150%')
  })
})
