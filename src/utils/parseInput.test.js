import { describe, it, expect } from 'vitest'
import { parsePastedText, parseExcelFile, generateSampleData } from './parseInput'
import * as XLSX from 'xlsx'

// ── parsePastedText ───────────────────────────────────────────────────────────

describe('parsePastedText', () => {
  it('parses tab-separated data with headers', () => {
    const input = [
      'Task Name\tStart\tEnd\tCategory',
      'Literature review\t2024-01-01\t2024-03-01\tWP1',
      'Data collection\t2024-02-01\t2024-06-01\tWP2',
    ].join('\n')

    const tasks = parsePastedText(input)
    expect(tasks).toHaveLength(2)
    expect(tasks[0].name).toBe('Literature review')
    expect(tasks[0].start).toBe('2024-01-01')
    expect(tasks[0].end).toBe('2024-03-01')
    expect(tasks[0].category).toBe('WP1')
    expect(tasks[1].name).toBe('Data collection')
  })

  it('parses CSV data with headers', () => {
    const input = 'Name,Start Date,End Date\nTask A,2024-01-01,2024-06-01\n'
    const tasks = parsePastedText(input)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].name).toBe('Task A')
    expect(tasks[0].start).toBe('2024-01-01')
  })

  it('handles headerless data (3 columns = name, start, end)', () => {
    const input = 'My task\t2024-01-01\t2024-12-31'
    const tasks = parsePastedText(input)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].name).toBe('My task')
    expect(tasks[0].start).toBe('2024-01-01')
    expect(tasks[0].end).toBe('2024-12-31')
  })

  it('returns empty array for empty input', () => {
    expect(parsePastedText('')).toHaveLength(0)
    expect(parsePastedText('   ')).toHaveLength(0)
  })

  it('skips rows with no task name', () => {
    const input = 'Task Name\tStart\tEnd\nReal task\t2024-01-01\t2024-06-01\n\t2024-01-01\t2024-06-01'
    const tasks = parsePastedText(input)
    expect(tasks).toHaveLength(1)
  })

  it('handles DD/MM/YYYY date format (day > 12 is unambiguous)', () => {
    // 15/03/2024 — day=15 > 12, so parser knows it's DD/MM/YYYY
    const input = 'Name\tStart\tEnd\nTask\t15/03/2024\t31/12/2024'
    const tasks = parsePastedText(input)
    expect(tasks[0].start).toBe('2024-03-15')
    expect(tasks[0].end).toBe('2024-12-31')
  })

  it('sets end = start when end is missing or before start', () => {
    const input = 'Name\tStart\tEnd\nTask\t2024-06-01\t2024-01-01'
    const tasks = parsePastedText(input)
    expect(tasks[0].end).toBe(tasks[0].start)
  })

  it('recognises flexible column name aliases', () => {
    const input = 'Activity\tBegin\tFinish\tPhase\nSurvey\t2024-01-01\t2024-03-01\tWP1'
    const tasks = parsePastedText(input)
    expect(tasks[0].name).toBe('Survey')
    expect(tasks[0].category).toBe('WP1')
  })
})

// ── parseExcelFile ────────────────────────────────────────────────────────────

describe('parseExcelFile', () => {
  function makeXlsx(rows) {
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  }

  it('parses a basic Excel file', () => {
    const buf = makeXlsx([
      ['Task Name', 'Start Date', 'End Date', 'Category'],
      ['WP1 work',  '2024-01-01', '2024-06-01', 'WP1'],
      ['WP2 work',  '2024-03-01', '2024-09-01', 'WP2'],
    ])
    const tasks = parseExcelFile(buf)
    expect(tasks).toHaveLength(2)
    expect(tasks[0].name).toBe('WP1 work')
    expect(tasks[0].category).toBe('WP1')
    expect(tasks[1].start).toBe('2024-03-01')
  })

  it('handles progress column', () => {
    const buf = makeXlsx([
      ['Task Name', 'Start', 'End', '% Complete'],
      ['Task A', '2024-01-01', '2024-06-01', 75],
    ])
    const tasks = parseExcelFile(buf)
    expect(tasks[0].progress).toBe(75)
  })

  it('clamps progress to 0–100', () => {
    const buf = makeXlsx([
      ['Task Name', 'Start', 'End', 'Progress'],
      ['Too high', '2024-01-01', '2024-06-01', 150],
      ['Too low',  '2024-01-01', '2024-06-01', -10],
    ])
    const tasks = parseExcelFile(buf)
    expect(tasks[0].progress).toBe(100)
    expect(tasks[1].progress).toBe(0)
  })
})

// ── generateSampleData ────────────────────────────────────────────────────────

describe('generateSampleData', () => {
  it('returns a non-empty array of valid tasks', () => {
    const tasks = generateSampleData()
    expect(tasks.length).toBeGreaterThan(0)
    for (const t of tasks) {
      expect(t.id).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(t.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(t.end >= t.start).toBe(true)
      expect(t.category).toBeTruthy()
    }
  })

  it('has tasks in multiple WP categories', () => {
    const tasks = generateSampleData()
    const categories = new Set(tasks.map(t => t.category))
    expect(categories.size).toBeGreaterThan(1)
  })
})
