import { expect, test } from '@playwright/test'
import { expectTheme, largeProject, openProject } from './fixtures.js'

test('renders 250 tasks, many categories, cycles, long names and long spans', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const project = largeProject()
  await openProject(page, project)
  await expectTheme(expect, page, testInfo.project.name)

  await expect(page.getByTestId('gantt-task')).toHaveCount(250, { timeout: 20_000 })
  await expect(page.getByTestId('gantt-task').first()).toHaveAttribute('title', /deliberately long task name/)
  await expect(page.getByText('Large cyclic programme, 2000 to 2045', { exact: true })).toBeVisible()
  await expect(page.getByText('Programme 30', { exact: true })).toBeAttached()
  expect(pageErrors).toEqual([])

  await testInfo.attach(`large-plan-${testInfo.project.name}.png`, {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  })
})
