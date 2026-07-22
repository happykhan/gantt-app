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

    fireEvent.click(screen.getByRole('button', { name: 'Export ▾' }))
    expect(screen.getByRole('button', { name: 'PNG' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SVG' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument()
  })

  it('does not partially replace the current project when a loaded file is invalid', async () => {
    const { container } = render(<App />)
    const input = container.querySelector('input[type="file"][accept=".json"]')
    const invalidProject = new File([JSON.stringify({
      schemaVersion: 1,
      title: 'Replacement title',
      categoryColors: {},
      tasks: [{ ...savedProject.tasks[0], start: '2026-99-99' }],
    })], 'invalid.json', { type: 'application/json' })

    fireEvent.change(input, { target: { files: [invalidProject] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Project was not loaded')
    expect(screen.getByDisplayValue('Study design')).toBeInTheDocument()
    expect(screen.getByText('Grant plan')).toBeInTheDocument()
  })

  it('loads empty tasks, title and colours as a complete project replacement', async () => {
    const { container } = render(<App />)
    const input = container.querySelector('input[type="file"][accept=".json"]')
    const emptyProject = new File([JSON.stringify({
      schemaVersion: 1,
      title: '',
      categoryColors: {},
      tasks: [],
    })], 'empty.json', { type: 'application/json' })

    fireEvent.change(input, { target: { files: [emptyProject] } })

    expect(await screen.findByText('Build your Gantt chart')).toBeInTheDocument()
    expect(screen.getByText('Tap to add chart title…')).toBeInTheDocument()
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('gantt-app-v1'))
      expect(saved.tasks).toEqual([])
      expect(saved.title).toBe('')
      expect(saved.categoryColors).toEqual({})
    })
  })
})
