import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import quotedCsv from '../test/fixtures/quoted.csv?raw'
import ImportModal from './ImportModal'

describe('ImportModal', () => {
  it('previews parsed rows and waits for explicit confirmation', () => {
    const onLoad = vi.fn()
    render(<ImportModal onLoad={onLoad} onClose={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: quotedCsv } })
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }))

    expect(screen.getByText('Study, design')).toBeInTheDocument()
    expect(onLoad).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Import 2 tasks' }))
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'table',
      project: expect.objectContaining({ tasks: expect.arrayContaining([expect.objectContaining({ name: 'Study, design' })]) }),
    }))
  })

  it('shows row errors and prevents confirmation', () => {
    const onLoad = vi.fn()
    render(<ImportModal onLoad={onLoad} onClose={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ID,Name,Start,End\none,Bad date,2026-99-99,2026-12-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Row 2')
    expect(screen.getByRole('button', { name: 'Resolve errors before importing' })).toBeDisabled()
    expect(onLoad).not.toHaveBeenCalled()
  })

  it('rejects cyclic dependencies in the import preview', () => {
    render(<ImportModal onLoad={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'ID,Name,Start,End,Dependencies\na,First,2026-01-01,2026-01-02,b\nb,Second,2026-01-02,2026-01-03,a' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Dependency cycle')
    expect(screen.getByRole('button', { name: 'Resolve errors before importing' })).toBeDisabled()
  })

  it('previews a JSON project with its title and colours before importing', async () => {
    const onLoad = vi.fn()
    const { container } = render(<ImportModal onLoad={onLoad} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Upload file' }))
    const input = container.querySelector('input[type="file"]')
    const file = new File([JSON.stringify({
      schemaVersion: 1,
      title: 'Imported plan',
      categoryColors: { WP1: '#0d9488' },
      tasks: [{
        id: 'task-1', name: 'Imported task', start: '2026-01-01', end: '2026-02-01',
        category: 'WP1', progress: 0, dependencies: '',
      }],
    })], 'project.json', { type: 'application/json' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('Project title: “Imported plan”')).toBeInTheDocument()
    expect(screen.getByText('1 task, 1 colours')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Import 1 task' }))
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'project',
      project: expect.objectContaining({ title: 'Imported plan', categoryColors: { WP1: '#0d9488' } }),
    }))
  })
})
