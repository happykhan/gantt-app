import { describe, expect, it } from 'vitest'
import { chooseResponsiveViewMode, clampZoom, getProjectSpanDays } from './viewDefaults'

const task = (start, end) => ({ start, end })

describe('responsive chart defaults', () => {
  it('uses project dates to calculate the full span', () => {
    expect(getProjectSpanDays([
      task('2026-03-01', '2026-04-01'),
      task('2026-01-01', '2026-06-01'),
    ])).toBe(151)
  })

  it('keeps short mobile projects readable instead of forcing Year view', () => {
    expect(chooseResponsiveViewMode([task('2026-01-01', '2026-03-01')], 390)).toBe('Month')
    expect(chooseResponsiveViewMode([task('2026-01-01', '2026-10-01')], 390)).toBe('Quarter')
  })

  it('uses finer defaults when more viewport width is available', () => {
    const tasks = [task('2026-01-01', '2026-03-01')]
    expect(chooseResponsiveViewMode(tasks, 1440)).toBe('Week')
  })

  it('only uses Year for genuinely long projects', () => {
    expect(chooseResponsiveViewMode([task('2026-01-01', '2031-01-01')], 390)).toBe('Year')
  })

  it('clamps fitted zoom to safe limits', () => {
    expect(clampZoom(0.18)).toBe(0.4)
    expect(clampZoom(1.237)).toBe(1.24)
    expect(clampZoom(4)).toBe(2)
  })
})
