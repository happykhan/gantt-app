import { expect, test } from '@playwright/test'
import { openEmpty } from './fixtures.js'

test('preview smoke: empty start and example render without browser errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await openEmpty(page)
  await expect(page.getByText('Gantt Builder', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Build your Gantt chart' })).toBeVisible()
  await page.getByRole('button', { name: 'Load example' }).click()
  await expect(page.getByTestId('gantt-task')).toHaveCount(12)
  expect(errors).toEqual([])
})
