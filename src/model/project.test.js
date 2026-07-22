import { describe, expect, it } from 'vitest'
import { createTask, deleteTask, moveTask, normaliseProject, renameCategory } from './project'

const tasks = [
  { id: 'one', name: 'One', start: '2026-01-01', end: '2026-01-10', category: 'WP1', dependencies: '' },
  { id: 'two', name: 'Two', start: '2026-01-11', end: '2026-01-20', category: 'WP2', dependencies: 'one' },
]

describe('project model', () => {
  it('normalises incomplete project data', () => {
    expect(normaliseProject({ tasks })).toEqual({ tasks, chartTitle: '', categoryColors: {} })
    expect(normaliseProject(null)).toEqual({ tasks: [], chartTitle: '', categoryColors: {} })
  })

  it('creates a task after the previous task', () => {
    expect(createTask(tasks)).toMatchObject({ start: '2026-01-20', end: '2026-02-19', category: 'WP2' })
  })

  it('removes references to a deleted dependency', () => {
    expect(deleteTask(tasks, 'one')).toEqual([{ ...tasks[1], dependencies: '' }])
  })

  it('moves and renames tasks without mutating the source', () => {
    expect(moveTask(tasks, 'two', -1).map(task => task.id)).toEqual(['two', 'one'])
    expect(renameCategory(tasks, 'WP1', 'Planning')[0].category).toBe('Planning')
    expect(tasks[0].category).toBe('WP1')
  })
})
