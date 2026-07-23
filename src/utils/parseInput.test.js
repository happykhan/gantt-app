import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import quotedCsv from '../test/fixtures/quoted.csv?raw'
import invalidDatesCsv from '../test/fixtures/invalid-dates.csv?raw'
import duplicateIdsCsv from '../test/fixtures/duplicate-ids.csv?raw'
import missingDependencyCsv from '../test/fixtures/missing-dependency.csv?raw'
import { generateSampleData, parseDateValue, parseExcelFile, parsePastedText } from './parseInput'

function makeXlsx(rows) {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

describe('parsePastedText', () => {
  it('parses quoted CSV fields and escaped quotes without losing commas', () => {
    const result = parsePastedText(quotedCsv)

    expect(result.errors).toEqual([])
    expect(result.tasks).toHaveLength(2)
    expect(result.tasks[0].name).toBe('Study, design')
    expect(result.tasks[0].start).toBe('2026-04-03')
    expect(result.tasks[1].name).toBe('Deliver "final" report')
    expect(result.tasks[1].dependencies).toBe('research')
    expect(result.categoryColors).toEqual({ WP1: '#0d9488', WP2: '#6366f1' })
  })

  it('parses RFC-style CRLF records', () => {
    const result = parsePastedText(quotedCsv.replace(/\n/g, '\r\n'))

    expect(result.errors).toEqual([])
    expect(result.tasks.map(task => task.name)).toEqual(['Study, design', 'Deliver "final" report'])
  })

  it('parses tab-separated and headerless data', () => {
    const withHeaders = parsePastedText('Task Name\tStart\tEnd\nReview\t2026-01-01\t2026-03-01')
    const headerless = parsePastedText('Review\t2026-01-01\t2026-03-01')

    expect(withHeaders.errors).toEqual([])
    expect(withHeaders.tasks[0].name).toBe('Review')
    expect(headerless.errors).toEqual([])
    expect(headerless.tasks[0].name).toBe('Review')
  })

  it('uses British day/month order for slash dates', () => {
    const result = parsePastedText('Name,Start,End\nTask,03/04/2026,30/04/2026')

    expect(result.errors).toEqual([])
    expect(result.tasks[0].start).toBe('2026-04-03')
  })

  it('reports impossible and unsupported ambiguous date formats by row', () => {
    const result = parsePastedText(invalidDatesCsv)

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 2, field: 'start', message: expect.stringContaining('valid calendar date') }),
      expect.objectContaining({ row: 3, field: 'start', message: expect.stringContaining('ISO') }),
    ]))
  })

  it('rejects duplicate IDs instead of silently changing them', () => {
    const result = parsePastedText(duplicateIdsCsv)

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 3, field: 'id', message: expect.stringContaining('duplicates') }),
    ]))
  })

  it('reports missing dependency references', () => {
    const result = parsePastedText(missingDependencyCsv)

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 3, field: 'dependencies', message: expect.stringContaining('not-present') }),
    ]))
  })

  it('rejects invalid progress and colours rather than clamping or accepting them', () => {
    const result = parsePastedText('ID,Name,Start,End,Category,Progress,Colour\none,Task,2026-01-01,2026-02-01,WP1,150,red')

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 2, field: 'progress' }),
      expect.objectContaining({ row: 2, field: 'colour' }),
    ]))
  })
})

describe('parseExcelFile', () => {
  it('converts Excel date serials into ISO dates', async () => {
    const result = await parseExcelFile(makeXlsx([
      ['Task ID', 'Task Name', 'Start', 'End'],
      ['excel', 'Excel dates', 46115, 46142],
    ]))

    expect(result.errors).toEqual([])
    expect(result.tasks[0].start).toBe('2026-04-03')
    expect(result.tasks[0].end).toBe('2026-04-30')
  })

  it('accepts valid numeric progress', async () => {
    const result = await parseExcelFile(makeXlsx([
      ['Task Name', 'Start', 'End', '% Complete'],
      ['Task A', '2026-01-01', '2026-06-01', 75],
    ]))

    expect(result.errors).toEqual([])
    expect(result.tasks[0].progress).toBe(75)
  })
})

describe('date and sample helpers', () => {
  it('validates Excel and calendar dates strictly', () => {
    expect(parseDateValue(46115)).toEqual({ value: '2026-04-03', error: null })
    expect(parseDateValue('2026-02-29').error).toContain('valid calendar')
    expect(parseDateValue('02/29/2026').error).toContain('British date')
  })

  it('generates valid sample tasks', () => {
    const tasks = generateSampleData()
    expect(tasks.length).toBeGreaterThan(0)
    expect(new Set(tasks.map(task => task.category)).size).toBeGreaterThan(1)
    tasks.forEach(task => expect(task.end >= task.start).toBe(true))
  })
})
