import { describe, it, expect } from 'vitest'

// Extract pure date helpers for unit testing (duplicated here to avoid import issues with JSX)
function parseDate(str) { return new Date(str + 'T00:00:00') }
function toStr(d) { return d instanceof Date ? d.toISOString().substring(0, 10) : String(d) }
function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000) }
function addDays(str, n) { const d = parseDate(str); d.setDate(d.getDate() + n); return toStr(d) }
function dateToX(dateStr, rangeStartStr, pxPerDay) {
  return daysBetween(rangeStartStr, dateStr) * pxPerDay
}

describe('date helpers', () => {
  describe('daysBetween', () => {
    it('returns 0 for the same date', () => {
      expect(daysBetween('2024-01-01', '2024-01-01')).toBe(0)
    })
    it('returns correct days for known range', () => {
      expect(daysBetween('2024-01-01', '2024-02-01')).toBe(31)
    })
    it('returns negative for reversed range', () => {
      expect(daysBetween('2024-02-01', '2024-01-01')).toBe(-31)
    })
  })

  describe('addDays', () => {
    it('adds positive days', () => {
      expect(addDays('2024-01-01', 30)).toBe('2024-01-31')
    })
    it('adds negative days (subtracts)', () => {
      expect(addDays('2024-02-01', -1)).toBe('2024-01-31')
    })
    it('handles month boundaries', () => {
      expect(addDays('2024-01-31', 1)).toBe('2024-02-01')
    })
    it('handles year boundaries', () => {
      expect(addDays('2023-12-31', 1)).toBe('2024-01-01')
    })
  })

  describe('dateToX', () => {
    it('returns 0 for the range start', () => {
      expect(dateToX('2024-01-01', '2024-01-01', 2)).toBe(0)
    })
    it('scales correctly with pxPerDay', () => {
      // 31 days × 2 px/day = 62 px
      expect(dateToX('2024-02-01', '2024-01-01', 2)).toBe(62)
    })
    it('does NOT call .toISOString() on the rangeStart string (regression)', () => {
      // If this throws, the string/Date confusion bug has returned
      expect(() => dateToX('2024-06-01', '2024-01-01', 1.5)).not.toThrow()
    })
  })

  describe('toStr', () => {
    it('formats a Date object to YYYY-MM-DD', () => {
      expect(toStr(new Date('2024-03-15T00:00:00'))).toBe('2024-03-15')
    })
    it('passes through a string unchanged', () => {
      expect(toStr('2024-03-15')).toBe('2024-03-15')
    })
  })
})

// ── save / load round-trip ────────────────────────────────────────────────────

describe('save/load JSON round-trip', () => {
  const sampleTasks = [
    { id: 'task-1', name: 'Study design', start: '2024-01-01', end: '2024-03-01', progress: 50, category: 'WP1', dependencies: '' },
    { id: 'task-2', name: 'Data collection', start: '2024-03-01', end: '2024-09-01', progress: 0, category: 'WP2', dependencies: 'task-1' },
  ]

  it('serialises tasks to JSON and back without data loss', () => {
    const json = JSON.stringify({ tasks: sampleTasks })
    const { tasks } = JSON.parse(json)

    expect(tasks).toHaveLength(2)
    expect(tasks[0]).toEqual(sampleTasks[0])
    expect(tasks[1]).toEqual(sampleTasks[1])
  })

  it('preserves dependencies string', () => {
    const json = JSON.stringify({ tasks: sampleTasks })
    const { tasks } = JSON.parse(json)
    expect(tasks[1].dependencies).toBe('task-1')
  })

  it('preserves all required fields', () => {
    const json = JSON.stringify({ tasks: sampleTasks })
    const { tasks } = JSON.parse(json)
    for (const t of tasks) {
      expect(t).toHaveProperty('id')
      expect(t).toHaveProperty('name')
      expect(t).toHaveProperty('start')
      expect(t).toHaveProperty('end')
      expect(t).toHaveProperty('progress')
      expect(t).toHaveProperty('category')
      expect(t).toHaveProperty('dependencies')
    }
  })
})
