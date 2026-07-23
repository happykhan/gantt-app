import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openEmpty, twoTaskProject } from './fixtures.js'

async function expectNoBlockingViolations(page, state) {
  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations
    .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
    .map(violation => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map(node => node.target.join(' ')),
    }))
  expect(blocking, `${state} has serious or critical accessibility violations`).toEqual([])
}

async function loadProject(page) {
  await page.evaluate(project => {
    localStorage.setItem('gantt-app-v1', JSON.stringify(project))
  }, twoTaskProject)
  await page.reload()
}

test('empty, populated, settings, import and edit states pass the accessibility smoke', async ({ page }) => {
  await openEmpty(page)
  await expectNoBlockingViolations(page, 'Empty project')

  await loadProject(page)
  await expect(page.getByTestId('gantt-task')).toHaveCount(2)
  await expectNoBlockingViolations(page, 'Populated project')

  await page.getByRole('button', { name: 'View' }).click()
  await page.getByRole('menuitem', { name: 'Display settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Display settings' })).toBeVisible()
  await expectNoBlockingViolations(page, 'Display settings')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Import' }).click()
  await expect(page.getByRole('dialog', { name: 'Import tasks' })).toBeVisible()
  await expectNoBlockingViolations(page, 'Import tasks')
  await page.keyboard.press('Escape')

  const firstTask = page.getByTestId('gantt-task').first()
  await firstTask.focus()
  await firstTask.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeVisible()
  await expectNoBlockingViolations(page, 'Edit task')
})

test('core chart, menu and dependency workflow is keyboard operable', async ({ page }, testInfo) => {
  await openEmpty(page)
  await loadProject(page)

  const firstTask = page.getByTestId('gantt-task').first()
  await firstTask.focus()
  const originalStart = await firstTask.getAttribute('data-start')
  await firstTask.press('ArrowRight')
  await expect(firstTask).not.toHaveAttribute('data-start', originalStart)

  await firstTask.press('F2')
  const rename = firstTask.getByRole('textbox')
  await expect(rename).toBeFocused()
  await rename.fill('Keyboard-renamed task')
  await rename.press('Enter')
  await expect(firstTask).toHaveAccessibleName(/Keyboard-renamed task/)

  await firstTask.press('Enter')
  const editor = page.getByRole('dialog', { name: 'Edit task' })
  await expect(editor).toBeVisible()
  await expect(page.getByLabel('Task name', { exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(editor).toBeHidden()
  await expect(firstTask).toBeFocused()

  const view = page.getByRole('button', { name: 'View' })
  await view.focus()
  await view.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Week' })).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.getByRole('menuitem', { name: 'Display settings' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Display settings' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(view).toBeFocused()

  if (testInfo.project.name.startsWith('mobile-')) {
    const secondTask = page.getByTestId('gantt-task').nth(1)
    await secondTask.focus()
    await secondTask.press('Enter')
    const predecessor = page.getByLabel('Keyboard-renamed task', { exact: true })
    await predecessor.focus()
    await predecessor.press('Space')
    await expect(predecessor).not.toBeChecked()
    await page.keyboard.press('Escape')
    await expect(secondTask).toBeFocused()
    return
  }

  const dependencyButton = page.getByRole('button', { name: /Dependencies for Fieldwork and analysis/ })
  await dependencyButton.focus()
  await dependencyButton.press('Enter')
  const dependencies = page.getByRole('dialog', { name: 'Dependencies' })
  await expect(dependencies).toBeVisible()
  await expect(page.getByLabel('Keyboard-renamed task', { exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dependencyButton).toBeFocused()
})

test('About route is useful, navigable and passes the accessibility smoke', async ({ page }) => {
  await page.goto('/about')

  await expect(page).toHaveTitle('About | Gantt Builder')
  await expect(page.getByRole('heading', { name: 'Plan the work. Present it clearly.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your plans stay with you' })).toBeVisible()
  await expect(page.getByLabel('Project workflow')).toHaveCount(0)
  await expectNoBlockingViolations(page, 'About page')

  await page.getByRole('link', { name: 'Open the builder' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByLabel('Project workflow')).toBeVisible()
})
