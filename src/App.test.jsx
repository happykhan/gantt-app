import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  afterEach(() => {
    vi.restoreAllMocks()
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

    fireEvent.click(screen.getByRole('button', { name: 'Export ▾' }))
    expect(screen.getByRole('button', { name: 'PNG' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SVG' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PDF fit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PDF landscape' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PDF tiled' })).toBeInTheDocument()
  })

  it('shows export failures in the app instead of opening a browser alert', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('Storage is unavailable') })
    const browserAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Export ▾' }))
    fireEvent.click(screen.getByRole('button', { name: 'SVG' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Export failed: Storage is unavailable')
    expect(browserAlert).not.toHaveBeenCalled()
  })

  it('explains why an empty chart cannot be exported', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.clear()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Export ▾' }))
    fireEvent.click(screen.getByRole('button', { name: 'SVG' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Add at least one task before exporting.')
  })
})
