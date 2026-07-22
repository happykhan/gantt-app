import { describe, expect, it } from 'vitest'
import { makeLargeProject } from '../test/fixtures/largeProject'
import { addDays, buildDependencyPaths, buildTimelineGeometry, dateToX, daysBetween, formatDate } from './geometry'

describe('chart geometry', () => {
  it('handles date arithmetic and month boundaries', () => {
    expect(daysBetween('2024-01-01', '2024-02-01')).toBe(31)
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01')
    expect(dateToX('2024-02-01', '2024-01-01', 2)).toBe(62)
    expect(formatDate('2024-03-15')).toBe('2024-03-15')
  })

  it('builds a responsive timeline and dependency paths', () => {
    const tasks = makeLargeProject(3)
    const geometry = buildTimelineGeometry(tasks, 'Month', 1200)
    const paths = buildDependencyPaths(tasks, geometry.rangeStart, geometry.pixelsPerDay, 52)
    expect(geometry.totalWidth).toBeGreaterThanOrEqual(1200)
    expect(paths).toHaveLength(2)
  })

  it('keeps the 250-task fixture geometry within an interaction-frame budget', () => {
    const tasks = makeLargeProject()
    const started = performance.now()
    const geometry = buildTimelineGeometry(tasks, 'Month', 1440)
    const paths = buildDependencyPaths(tasks, geometry.rangeStart, geometry.pixelsPerDay, 52)
    const elapsed = performance.now() - started

    expect(paths).toHaveLength(249)
    expect(elapsed).toBeLessThan(50)
  })
})
