import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import * as XLSX from 'xlsx'
import { openEmpty, openProject, twoTaskProject } from './fixtures.js'

async function openFileImport(page) {
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await page.getByRole('tab', { name: 'Upload file' }).click()
  return page.locator('input[type="file"][accept*=".xlsx"]')
}

async function confirmFileImport(page, taskCount) {
  const label = taskCount === 1 ? 'Import 1 task' : `Import ${taskCount} tasks`
  await page.getByRole('button', { name: label }).click()
}

test('imports quoted CSV, Excel and JSON files', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'File-format coverage runs once; the core workflow covers the full viewport and colour matrix.')
  await openEmpty(page)

  let input = await openFileImport(page)
  await input.setInputFiles({
    name: 'quoted.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Task Name,Start,End,Category,Progress\r\n"Study, design",2026-01-02,2026-02-28,Planning,25\r\n'),
  })
  await confirmFileImport(page, 1)
  await expect(page.getByTestId('gantt-task').filter({ hasText: 'Study, design' })).toHaveCount(1)

  input = await openFileImport(page)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { 'Task Name': 'Excel recruitment', Start: '2026-03-01', End: '2026-04-15', Category: 'Delivery', Progress: 10 },
  ]), 'Tasks')
  await input.setInputFiles({
    name: 'tasks.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })),
  })
  await confirmFileImport(page, 1)
  await expect(page.getByTestId('gantt-task').filter({ hasText: 'Excel recruitment' })).toHaveCount(1)

  input = await openFileImport(page)
  await input.setInputFiles({
    name: 'project.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(twoTaskProject)),
  })
  await confirmFileImport(page, 2)
  await expect(page.getByTestId('gantt-task')).toHaveCount(2)
  await expect(page.getByTestId('gantt-task').filter({ hasText: 'Protocol design' })).toHaveCount(1)
})

test('saves, clears and opens a project file', async ({ page }) => {
  await openProject(page, twoTaskProject)
  await page.getByRole('button', { name: /^Project/ }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Save project file' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('gantt-project.json')
  const savedPath = await download.path()
  expect(JSON.parse(await readFile(savedPath, 'utf8')).tasks).toHaveLength(2)

  await page.getByRole('button', { name: /^Project/ }).click()
  await page.getByRole('menuitem', { name: 'Clear project' }).click()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page.getByRole('heading', { name: 'Build your Gantt chart' })).toBeVisible()

  await page.getByRole('button', { name: /^Project/ }).click()
  await page.locator('input[type="file"][accept=".json"]').setInputFiles(savedPath)
  await expect(page.getByTestId('gantt-task')).toHaveCount(2)
  await expect(page.getByText('Regression plan', { exact: true })).toBeVisible()
})

test('downloads PNG, SVG and PDF exports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'Export formats are deterministic and only need one Chromium project.')
  await openProject(page, twoTaskProject)

  for (const [label, extension, signature] of [
    ['PNG image', '.png', Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    ['SVG image', '.svg', Buffer.from('<?xml')],
    ['PDF document', '.pdf', Buffer.from('%PDF')],
  ]) {
    await page.getByRole('button', { name: /^Export/ }).click()
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await page.getByRole('menuitem', { name: label }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain(extension)
    const bytes = await readFile(await download.path())
    expect(bytes.subarray(0, signature.length).equals(signature)).toBe(true)
    expect(bytes.length).toBeGreaterThan(500)
  }
})
