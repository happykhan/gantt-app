import { expect, test } from '@playwright/test'
import { expectTheme, openEmpty, openProject, twoTaskProject } from './fixtures.js'

test('starts empty and loads the built-in example', async ({ page }, testInfo) => {
  await openEmpty(page)
  await expectTheme(expect, page, testInfo.project.name)
  await expect(page.getByRole('heading', { name: 'Build your Gantt chart' })).toBeVisible()
  await expect(page.getByTestId('gantt-task')).toHaveCount(0)

  await page.getByRole('button', { name: 'Load example' }).click()
  await expect(page.getByTestId('gantt-task').first()).toBeVisible()
  await expect(page.getByTestId('gantt-task')).toHaveCount(12)
})

test('creates, edits, links, persists, deletes and restores tasks', async ({ page }) => {
  await openEmpty(page)
  await page.getByRole('button', { name: 'Create first task' }).click()
  await expect(page.getByRole('heading', { name: 'Edit task' })).toBeVisible()
  await page.getByLabel('Task name', { exact: true }).fill('Protocol design')
  await page.getByLabel('Start date', { exact: true }).fill('2026-01-05')
  await page.getByLabel('End date', { exact: true }).fill('2026-02-20')
  await page.getByLabel('Category', { exact: true }).fill('Planning')
  await page.getByLabel('Progress', { exact: true }).fill('35')
  await page.getByRole('button', { name: 'Save task' }).click()

  await page.getByRole('button', { name: 'Task', exact: true }).click()
  await page.getByLabel('Task name', { exact: true }).fill('Fieldwork and analysis')
  await page.getByLabel('Start date', { exact: true }).fill('2026-02-23')
  await page.getByLabel('End date', { exact: true }).fill('2026-05-15')
  await page.getByLabel('Category', { exact: true }).fill('Delivery')
  await page.getByLabel('Protocol design', { exact: true }).check()
  await page.getByRole('button', { name: 'Save task' }).click()

  await expect(page.getByTestId('gantt-task')).toHaveCount(2)
  await expect(page.getByTestId('gantt-task').filter({ hasText: 'Fieldwork and analysis' })).toHaveCount(1)
  await page.waitForTimeout(700)
  await page.reload()
  await expect(page.getByTestId('gantt-task')).toHaveCount(2)

  await page.getByTestId('gantt-task').filter({ hasText: 'Fieldwork and analysis' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByTestId('gantt-task')).toHaveCount(1)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByTestId('gantt-task')).toHaveCount(2)
})

test('edits table fields and dependencies on desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile-'), 'The mobile project uses task cards and the task editor.')
  await openProject(page, twoTaskProject)
  const row = page.locator('[data-testid="task-row"][data-task-id="planning"]')
  await expect(row).toBeVisible()

  const name = row.getByLabel('Task name for Protocol design')
  await name.fill('Revised protocol design')
  await name.press('Tab')
  const category = row.getByLabel('Category for Revised protocol design')
  await category.fill('Governance')
  await category.press('Tab')
  const progress = row.getByLabel('Progress for Revised protocol design')
  await progress.fill('65')
  await progress.press('Tab')

  const secondRow = page.locator('[data-testid="task-row"][data-task-id="delivery"]')
  await secondRow.getByRole('button', { name: 'Dependencies for Fieldwork and analysis' }).click()
  await expect(page.getByRole('heading', { name: 'Dependencies' })).toBeVisible()
  await expect(page.getByLabel('Revised protocol design', { exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await page.waitForTimeout(700)
  await page.reload()
  await expect(page.locator('input[value="Revised protocol design"]')).toBeVisible()
  await expect(page.locator('input[value="Governance"]')).toBeVisible()
  await expect(page.locator('input[value="65"]')).toBeVisible()
})

test('moves and resizes a chart bar on desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile-'), 'Touch uses scrolling and opens the mobile task editor by design.')
  await openProject(page, twoTaskProject)
  const bar = page.getByTestId('gantt-task').filter({ hasText: 'Protocol design' })
  const originalStart = await bar.getAttribute('data-start')
  const originalEnd = await bar.getAttribute('data-end')
  let box = await bar.boundingBox()

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 48, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect(bar).not.toHaveAttribute('data-start', originalStart)

  box = await bar.boundingBox()
  const movedEnd = await bar.getAttribute('data-end')
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width + 35, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect(bar).not.toHaveAttribute('data-end', movedEnd)
  expect(await bar.getAttribute('data-end')).not.toBe(originalEnd)
})
