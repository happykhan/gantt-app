import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { AUTOSAVE_KEY } from './utils/storage'

const earlyProject = {
  schemaVersion: 1,
  title: 'Dependency plan',
  categoryColors: {},
  tasks: [
    {
      id: 'research', name: 'Research predecessor with a name that is deliberately very long',
      start: '2026-01-01', end: '2026-02-10', category: '', dependencies: '', progress: 0,
    },
    {
      id: 'analysis', name: 'Analysis', start: '2026-02-01', end: '2026-03-01',
      category: '', dependencies: 'research', progress: 0,
    },
  ],
}

function loadAtWidth(width, project = earlyProject) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project))
  return render(<App />)
}

describe.each([
  ['desktop', 1200],
  ['mobile', 500],
])('dependency scheduling on %s', (_label, width) => {
  beforeEach(() => localStorage.clear())

  it('names the predecessor, gives the earliest start and only moves on request', async () => {
    loadAtWidth(width)

    expect(screen.getByText(/starts before Research predecessor/)).toHaveTextContent('Earliest valid start: 2026-02-10')
    expect(JSON.parse(localStorage.getItem(AUTOSAVE_KEY)).tasks[1].start).toBe('2026-02-01')

    fireEvent.click(screen.getByRole('button', { name: 'Move Analysis after predecessors' }))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(AUTOSAVE_KEY)).tasks[1].start).toBe('2026-02-10')
    })
    expect(screen.queryByText(/starts before Research predecessor/)).not.toBeInTheDocument()
  })
})

describe('dependency editing', () => {
  beforeEach(() => localStorage.clear())

  it('rejects a cycle and leaves the editor open with clear feedback', async () => {
    loadAtWidth(1200, {
      ...earlyProject,
      tasks: [
        { ...earlyProject.tasks[0], end: '2026-02-01' },
        { ...earlyProject.tasks[1], start: '2026-02-01', dependencies: 'research' },
      ],
    })

    fireEvent.click(screen.getAllByTitle('Click to set which tasks must finish before this one starts')[0])
    const modal = screen.getByRole('heading', { name: 'Dependencies' }).parentElement.parentElement
    fireEvent.click(within(modal).getByRole('checkbox', { name: 'Analysis' }))
    fireEvent.click(within(modal).getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Change rejected. Dependency cycle')
    expect(screen.getByRole('heading', { name: 'Dependencies' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(AUTOSAVE_KEY)).tasks[0].dependencies).toBe('')
  })

  it('rejects a cycle from the mobile task editor', async () => {
    loadAtWidth(500, {
      ...earlyProject,
      tasks: [
        { ...earlyProject.tasks[0], end: '2026-02-01' },
        { ...earlyProject.tasks[1], start: '2026-02-01', dependencies: 'research' },
      ],
    })

    const bar = screen.getByTestId('gantt-bar-research')
    bar.getBoundingClientRect = () => ({ left: 0, width: 100 })
    fireEvent.mouseDown(bar, { button: 0, clientX: 50 })
    fireEvent.mouseUp(window, { clientX: 50 })
    const editor = screen.getByRole('heading', { name: 'Edit task' }).parentElement.parentElement
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Analysis' }))
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Change rejected. Dependency cycle')
    expect(screen.getByRole('heading', { name: 'Edit task' })).toBeInTheDocument()
  })

  it('filters a large dependency list by full task name or ID', () => {
    const extraTasks = Array.from({ length: 40 }, (_, index) => ({
      id: `extra-${index}`, name: `Long predecessor option ${index}`,
      start: '2026-01-01', end: '2026-01-02', category: '', dependencies: '', progress: 0,
    }))
    loadAtWidth(1200, { ...earlyProject, tasks: [...extraTasks, { ...earlyProject.tasks[1], dependencies: '' }] })

    fireEvent.click(screen.getAllByTitle('Click to set which tasks must finish before this one starts').at(-1))
    const search = screen.getByRole('searchbox', { name: 'Search predecessor tasks' })
    fireEvent.change(search, { target: { value: 'extra-39' } })
    expect(screen.getByRole('checkbox', { name: 'Long predecessor option 39' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Long predecessor option 1' })).not.toBeInTheDocument()
  })
})
