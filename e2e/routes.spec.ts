import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('the placeholder route is accessible', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Turntable' })).toBeVisible()
  await expect(page.getByText('Scaffold ready')).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations).toEqual([])
})

test('an unknown route is accessible and returns 404', async ({ page }) => {
  const response = await page.goto('/unknown-route')

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Return to Turntable' })).toHaveAttribute('href', '/')

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations).toEqual([])
})
