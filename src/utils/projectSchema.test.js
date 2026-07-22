import { describe, expect, it } from 'vitest'
import legacyProject from '../test/fixtures/legacy-project.json'
import { parseProjectObject, parseProjectText, serialiseProject } from './projectSchema'

const task = {
  id: 'task-1',
  name: 'Study design',
  start: '2026-01-01',
  end: '2026-03-01',
  category: 'WP1',
  dependencies: '',
  progress: 25,
}

describe('project schema', () => {
  it('migrates legacy JSON and fills legacy optional task fields', () => {
    const result = parseProjectObject(legacyProject)

    expect(result.errors).toEqual([])
    expect(result.project).toEqual({
      schemaVersion: 1,
      title: 'Legacy grant plan',
      tasks: [{
        id: 'legacy-1',
        name: 'Legacy task',
        start: '2026-01-01',
        end: '2026-02-01',
        progress: 0,
        category: '',
        dependencies: '',
      }],
      categoryColors: { WP1: '#0d9488' },
    })
  })

  it('round-trips title, colours and tasks through the versioned format', () => {
    const saved = serialiseProject({
      tasks: [task],
      chartTitle: 'Grant plan',
      categoryColors: { WP1: '#0d9488' },
    })
    const result = parseProjectText(JSON.stringify(saved))

    expect(result.errors).toEqual([])
    expect(result.project.title).toBe('Grant plan')
    expect(result.project.tasks).toEqual([task])
    expect(result.project.categoryColors).toEqual({ WP1: '#0d9488' })
  })

  it('round-trips an entirely empty project', () => {
    const saved = serialiseProject({ tasks: [], chartTitle: '', categoryColors: {} })
    const result = parseProjectText(JSON.stringify(saved))

    expect(result).toEqual({
      project: { schemaVersion: 1, title: '', tasks: [], categoryColors: {} },
      errors: [],
    })
  })

  it('validates duplicate IDs, dependencies, progress and colours', () => {
    const result = parseProjectObject({
      schemaVersion: 1,
      title: '',
      categoryColors: { WP1: 'teal' },
      tasks: [
        task,
        { ...task, name: 'Duplicate', dependencies: 'missing', progress: 101 },
      ],
    })

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'categoryColors' }),
      expect.objectContaining({ row: 2, field: 'id' }),
      expect.objectContaining({ row: 2, field: 'progress' }),
      expect.objectContaining({ row: 2, field: 'dependencies' }),
    ]))
  })

  it('rejects unsupported future schema versions', () => {
    const result = parseProjectObject({ schemaVersion: 99, title: '', tasks: [], categoryColors: {} })
    expect(result.project).toBeNull()
    expect(result.errors[0].message).toContain('not supported')
  })
})
