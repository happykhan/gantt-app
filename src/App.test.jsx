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
      expect(saved.chartTitle).toBe('Grant plan')
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
})
