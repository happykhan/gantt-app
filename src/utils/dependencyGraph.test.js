import { describe, expect, it } from 'vitest'
import { moveTaskAfterPredecessors, removeTaskFromGraph, validateDependencyGraph } from './dependencyGraph'
import { parseProjectObject, serialiseProject } from './projectSchema'

function task(id, start, end, dependencies = '') {
  return { id, name: `Task ${id}`, start, end, dependencies, category: '', progress: 0 }
}

describe('dependency graph validation', () => {
  it('accepts chains and diamonds and preserves a valid DAG through project round-trip', () => {
    const tasks = [
      task('a', '2026-01-01', '2026-01-10'),
      task('b', '2026-01-10', '2026-01-20', 'a'),
      task('c', '2026-01-10', '2026-01-25', 'a'),
      task('d', '2026-01-25', '2026-02-01', 'b, c'),
    ]

    const graph = validateDependencyGraph(tasks)
    expect(graph.valid).toBe(true)
    expect(graph.renderEdges).toHaveLength(4)
    expect(graph.scheduleWarnings).toEqual([])

    const saved = serialiseProject({ tasks, chartTitle: 'Diamond', categoryColors: {} })
    const loaded = parseProjectObject(saved)
    expect(loaded.errors).toEqual([])
    expect(loaded.project.tasks).toEqual(tasks)
  })

  it('reports every early predecessor and the latest predecessor end', () => {
    const tasks = [
      { ...task('research', '2026-01-01', '2026-02-10'), name: 'Research with a very long predecessor name' },
      { ...task('approval', '2026-01-01', '2026-02-20'), name: 'Ethics approval' },
      { ...task('analysis', '2026-02-01', '2026-03-01', 'research, approval'), name: 'Analysis' },
    ]

    const [warning] = validateDependencyGraph(tasks).scheduleWarnings
    expect(warning.predecessorNames).toEqual(['Research with a very long predecessor name', 'Ethics approval'])
    expect(warning.earliestValidStart).toBe('2026-02-20')
    expect(warning.message).toContain('Research with a very long predecessor name and Ethics approval')

    const moved = moveTaskAfterPredecessors(tasks, 'analysis')
    expect(moved[2]).toMatchObject({ start: '2026-02-20', end: '2026-03-20' })
    expect(validateDependencyGraph(moved).scheduleWarnings).toEqual([])
  })

  it('rejects missing IDs, missing references, self-links and repeated links', () => {
    const graph = validateDependencyGraph([
      task('', '2026-01-01', '2026-01-02'),
      task('a', '2026-01-01', '2026-01-02', 'a, missing, missing'),
    ])

    expect(graph.errors.map(item => item.code)).toEqual(expect.arrayContaining([
      'missing-task-id', 'self-dependency', 'missing-dependency', 'duplicate-dependency',
    ]))
  })

  it('detects a cycle without recursing or exposing cyclic render edges', () => {
    const graph = validateDependencyGraph([
      task('a', '2026-01-01', '2026-01-02', 'c'),
      task('b', '2026-01-02', '2026-01-03', 'a'),
      task('c', '2026-01-03', '2026-01-04', 'b'),
    ])

    expect(graph.valid).toBe(false)
    expect(graph.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'dependency-cycle' }),
    ]))
    expect(graph.renderEdges).toEqual([])
  })

  it('handles a large invalid plan in linear graph passes', () => {
    const tasks = Array.from({ length: 3000 }, (_, index) => task(
      `task-${index}`,
      '2026-01-01',
      '2026-01-02',
      index === 0 ? 'task-2999' : `task-${index - 1}`,
    ))
    const graph = validateDependencyGraph(tasks)
    expect(graph.valid).toBe(false)
    expect(graph.errors.some(item => item.code === 'dependency-cycle')).toBe(true)
  })

  it('cleans deleted references and keeps dependency IDs unchanged through reorder', () => {
    const tasks = [
      task('a', '2026-01-01', '2026-01-02'),
      task('b', '2026-01-02', '2026-01-03', 'a'),
      task('c', '2026-01-03', '2026-01-04', 'a, b'),
    ]
    const reordered = [tasks[2], tasks[0], tasks[1]]
    expect(reordered[0].dependencies).toBe('a, b')
    expect(validateDependencyGraph(reordered).valid).toBe(true)

    const deleted = removeTaskFromGraph(reordered, 'a')
    expect(deleted.map(item => item.id)).toEqual(['c', 'b'])
    expect(deleted.find(item => item.id === 'c').dependencies).toBe('b')
    expect(deleted.find(item => item.id === 'b').dependencies).toBe('')
    expect(validateDependencyGraph(deleted).valid).toBe(true)
  })
})

