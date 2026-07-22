import { describe, expect, it } from 'vitest'
import { loadStoredProject, parseProjectFile, PROJECT_STORAGE_KEY, saveStoredProject } from './projectPersistence'

describe('project persistence', () => {
  it('round-trips the complete project model', () => {
    const values = new Map()
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
    const project = { tasks: [{ id: 'one' }], chartTitle: 'Plan', categoryColors: { WP1: '#fff' } }
    saveStoredProject(project, storage)
    expect(values.has(PROJECT_STORAGE_KEY)).toBe(true)
    expect(loadStoredProject(storage)).toEqual(project)
  })

  it('rejects a project file without tasks', () => {
    expect(() => parseProjectFile('{"tasks":[]}')).toThrow('No tasks found')
  })
})
