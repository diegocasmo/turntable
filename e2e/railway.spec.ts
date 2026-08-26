import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

function readE2EValue(name: string) {
  const value = process.env[name]

  if (value === undefined || value.length === 0) {
    throw new Error(`The E2E setup did not provide ${name}.`)
  }

  return value
}

test('a user can select the configured Railway service and see its status', async ({ page }) => {
  const environmentId = readE2EValue('RAILWAY_TEST_ENVIRONMENT_ID')
  const expectedStatus = readE2EValue('RAILWAY_TEST_EXPECTED_STATUS')
  const projectId = readE2EValue('RAILWAY_TEST_PROJECT_ID')
  const serviceId = readE2EValue('RAILWAY_TEST_SERVICE_ID')
  const token = readE2EValue('RAILWAY_TEST_TOKEN')

  await page.goto('/')
  await page.getByLabel('Railway API token').fill(token)
  await page.getByRole('button', { name: 'Connect to Railway' }).click()
  await expect(page.getByRole('heading', { name: 'Connected to Railway' })).toBeVisible()
  expect(new URL(page.url()).searchParams.has('token')).toBe(false)

  await page.getByRole('combobox', { name: 'Project' }).selectOption(projectId)
  await page.getByRole('combobox', { name: 'Environment' }).selectOption(environmentId)
  await page.getByRole('combobox', { name: 'Service' }).selectOption(serviceId)

  const deploymentStatus = page.getByRole('status', { name: 'Deployment status' })
  await expect(deploymentStatus.getByText(expectedStatus, { exact: true })).toBeVisible()
  await expect
    .poll(() => [...new URL(page.url()).searchParams].sort())
    .toEqual(
      [
        ['environmentId', environmentId],
        ['projectId', projectId],
        ['serviceId', serviceId],
      ].sort(),
    )
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
