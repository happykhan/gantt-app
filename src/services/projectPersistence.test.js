import { describe, expect, it } from 'vitest'
import { loadStoredProject, parseProjectFile, PROJECT_STORAGE_KEY, saveStoredProject } from './projectPersistence'

describe('project persistence', () => {
  it('round-trips the complete project model', () => {
    const values = new Map()
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
    const project = {
      tasks: [{
        id: 'one',
        name: 'Plan task',
        start: '2026-01-01',
        end: '2026-01-02',
        progress: 0,
        category: 'WP1',
        dependencies: '',
      }],
      chartTitle: 'Plan',
      categoryColors: { WP1: '#ffffff' },
    }
    saveStoredProject(project, storage)
    expect(values.has(PROJECT_STORAGE_KEY)).toBe(true)
    expect(loadStoredProject(storage)).toEqual(project)
  })

  it('accepts an empty project so clearing work can be persisted', () => {
    expect(parseProjectFile('{"tasks":[]}')).toEqual({
      tasks: [],
      chartTitle: '',
      categoryColors: {},
    })
  })
})
