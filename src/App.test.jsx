import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

const savedProject = {
  tasks: [
    {
      id: 'task-1',
      name: 'Study design',
      start: '2026-01-01',
      end: '2026-03-01',
      category: 'WP1',
      dependencies: '',
      progress: 25,
    },
  ],
  chartTitle: 'Grant plan',
  categoryColors: { WP1: '#0d9488' },
}

describe('App project workflow', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('gantt-app-v1', JSON.stringify(savedProject))
    window.history.replaceState({}, '', '/')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
  })

  it('edits a task and persists the change in local storage', async () => {
    render(<App />)

    const taskName = screen.getByDisplayValue('Study design')
    fireEvent.focus(taskName)
    fireEvent.change(taskName, { target: { value: 'Updated study design' } })
    fireEvent.blur(taskName)

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('gantt-app-v1'))
      expect(saved.tasks[0].name).toBe('Updated study design')
      expect(saved.schemaVersion).toBe(1)
      expect(saved.title).toBe('Grant plan')
      expect(saved.categoryColors).toEqual({ WP1: '#0d9488' })
    })
  })

  it('keeps import and all export actions available', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Import' }))
    expect(screen.getByText('Import tasks')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close import' }))

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(screen.getByRole('menuitem', { name: 'PNG image' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'SVG image' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'PDF document' })).toBeInTheDocument()
  })

  it('groups view controls and keeps fit and reset actions discoverable', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitem', { name: 'Fit to project' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Reset zoom/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Week' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Year' })).toBeInTheDocument()
  })

  it('keeps the primary workflow available without opening Help', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Task' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit tasks' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dependencies: select a task first' })).toBeInTheDocument()
  })

  it('does not partially replace the current project when a loaded file is invalid', async () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Project' }))
    const input = container.querySelector('input[type="file"][accept=".json"]')
    const invalidProject = new File([JSON.stringify({
      schemaVersion: 1,
      title: 'Replacement title',
      categoryColors: {},
      tasks: [{ ...savedProject.tasks[0], start: '2026-99-99' }],
    })], 'invalid.json', { type: 'application/json' })

    fireEvent.change(input, { target: { files: [invalidProject] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('That project file could not be loaded')
    expect(screen.getByDisplayValue('Study design')).toBeInTheDocument()
    expect(screen.getByText('Grant plan')).toBeInTheDocument()
  })

  it('loads empty tasks, title and colours as a complete project replacement', async () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Project' }))
    const input = container.querySelector('input[type="file"][accept=".json"]')
    const emptyProject = new File([JSON.stringify({
      schemaVersion: 1,
      title: '',
      categoryColors: {},
      tasks: [],
    })], 'empty.json', { type: 'application/json' })

    fireEvent.change(input, { target: { files: [emptyProject] } })

    expect(await screen.findByText('Build your Gantt chart')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add project title' })).toBeInTheDocument()
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('gantt-app-v1'))
      expect(saved.tasks).toEqual([])
      expect(saved.title).toBe('')
      expect(saved.categoryColors).toEqual({})
    })
  })
})

describe('App routes', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('renders a real About page at /about without mounting the project workspace', () => {
    window.history.replaceState({}, '', '/about')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Plan the work. Present it clearly.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your plans stay with you' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Project workflow')).not.toBeInTheDocument()
    expect(document.title).toBe('About | Gantt Builder')
  })

  it('navigates from About back to the builder', async () => {
    window.history.replaceState({}, '', '/about')
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Open the builder' }))

    expect(await screen.findByLabelText('Project workflow')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
    expect(document.title).toBe('Gantt Chart Builder')
  })
})
