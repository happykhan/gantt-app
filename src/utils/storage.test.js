import { beforeEach, describe, expect, it } from 'vitest'
import {
  AUTOSAVE_BACKUP_KEY,
  AUTOSAVE_KEY,
  SETTINGS_KEY,
  loadAutosave,
  loadDisplaySettings,
  saveAutosave,
  saveDisplaySettings,
} from './storage'

const task = {
  id: 'task-1', name: 'Study', start: '2026-01-01', end: '2026-02-01',
  progress: 0, category: '', dependencies: '',
}

describe('local storage recovery', () => {
  beforeEach(() => localStorage.clear())

  it('migrates a legacy autosave and tolerates corrupt JSON', () => {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ tasks: [task], chartTitle: 'Legacy', colors: {} }))
    expect(loadAutosave(localStorage).chartTitle).toBe('Legacy')

    localStorage.setItem(AUTOSAVE_KEY, '{broken')
    expect(loadAutosave(localStorage)).toEqual({ tasks: [], chartTitle: '', categoryColors: {} })
  })

  it('recovers the last known good project when the current slot is corrupt', () => {
    saveAutosave(localStorage, { tasks: [task], chartTitle: 'First', categoryColors: {} })
    saveAutosave(localStorage, { tasks: [{ ...task, name: 'Second' }], chartTitle: 'Second', categoryColors: {} })
    localStorage.setItem(AUTOSAVE_KEY, '{broken')

    expect(localStorage.getItem(AUTOSAVE_BACKUP_KEY)).toBeTruthy()
    expect(loadAutosave(localStorage).chartTitle).toBe('First')
  })

  it('does not replace a valid autosave with invalid editor data', () => {
    saveAutosave(localStorage, { tasks: [task], chartTitle: 'Valid', categoryColors: {} })
    expect(saveAutosave(localStorage, { tasks: [{ ...task, start: 'bad' }], chartTitle: 'Invalid', categoryColors: {} })).toBe(false)
    expect(loadAutosave(localStorage).chartTitle).toBe('Valid')
  })

  it('restores every display setting and validates corrupt values', () => {
    const settings = loadDisplaySettings(localStorage, 1200)
    const saved = {
      ...settings,
      viewMode: 'Month', labelMode: 'classic', zoom: 1.5, displayDensity: 'compact',
      chartFont: 'Arial, sans-serif', chartFontSize: 14, exportScale: 4,
      showTable: false, tableHeight: 333, labelWidth: 222,
      columnWidths: { ...settings.columnWidths, name: 321 },
    }
    expect(saveDisplaySettings(localStorage, saved)).toBe(true)
    expect(loadDisplaySettings(localStorage, 500)).toEqual(saved)

    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ viewMode: 'Decade', zoom: 99 }))
    expect(loadDisplaySettings(localStorage, 500)).toMatchObject({ viewMode: 'Year', zoom: 1 })
  })

  it('migrates the old scattered preference keys', () => {
    localStorage.setItem('gantt-viewMode', 'Month')
    localStorage.setItem('gantt-labelMode', 'classic')
    localStorage.setItem('gantt-tableHeight', '310')
    localStorage.setItem('gantt-colWidths', JSON.stringify({ name: 250 }))

    expect(loadDisplaySettings(localStorage, 500)).toMatchObject({
      viewMode: 'Month', labelMode: 'classic', tableHeight: 310,
      columnWidths: expect.objectContaining({ name: 250 }),
    })
  })
})
