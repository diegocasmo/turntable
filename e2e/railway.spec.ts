import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  readRailwayE2EConfig,
  restoreRailwayE2ETarget,
  runWithRailwayE2ETarget,
  startRailwayE2EDeployment,
  waitForRailwayE2EDeployment,
} from './railway'

const railwayStatusTimeoutMilliseconds = 120_000
const railwayTestTimeoutMilliseconds = 480_000
const expectRailwayStatus = expect.configure({ timeout: railwayStatusTimeoutMilliseconds })

test.describe.configure({ timeout: railwayTestTimeoutMilliseconds })

test('a user can control and refresh the configured Railway service', async ({ page }) => {
  const config = readRailwayE2EConfig()
  const { environmentId, projectId, serviceId } = config.target

  await runWithRailwayE2ETarget(config, async () => {
    let spinDownAttempted = false

    try {
      await page.goto('/')
      await page.getByLabel('Railway API token').fill(config.token)
      await page.getByRole('button', { name: 'Connect to Railway' }).click()
      await expect(page.getByRole('heading', { name: 'Connected to Railway' })).toBeVisible()
      expect(new URL(page.url()).searchParams.has('token')).toBe(false)

      await page.getByRole('combobox', { name: 'Project' }).selectOption(projectId)
      await page.getByRole('combobox', { name: 'Environment' }).selectOption(environmentId)
      await page.getByRole('combobox', { name: 'Service' }).selectOption(serviceId)

      const deploymentStatus = page.getByRole('status', { name: 'Deployment status' })
      await expectRailwayStatus(
        deploymentStatus.getByText('Success', { exact: true }),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Spin down' }).click()
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toHaveAccessibleName('Spin down deployment?')
      spinDownAttempted = true
      await dialog.getByRole('button', { name: 'Spin down' }).click()
      await expectRailwayStatus(
        deploymentStatus.getByText('Removed', { exact: true }),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Spin up' }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Spin up' }).click()
      await expectRailwayStatus(
        deploymentStatus.getByText('Success', { exact: true }),
      ).toBeVisible()

      await page.getByRole('button', { name: 'Spin down' }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Spin down' }).click()
      await expectRailwayStatus(
        deploymentStatus.getByText('Removed', { exact: true }),
      ).toBeVisible()

      const externalDeploymentId = await startRailwayE2EDeployment(config)
      await waitForRailwayE2EDeployment(config, externalDeploymentId)
      await page.getByRole('button', { name: 'Refresh' }).click()
      await expectRailwayStatus(
        deploymentStatus.getByText('Success', { exact: true }),
      ).toBeVisible()
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
    } finally {
      if (spinDownAttempted) await restoreRailwayE2ETarget(config)
    }
  })
})
