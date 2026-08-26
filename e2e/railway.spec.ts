import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  railwayTargetNames,
  readRailwayE2EConfig,
  restoreRailwayE2ETarget,
  runWithRailwayE2ETarget,
} from './railway'

test('a user can select the configured Railway service and see its status', async ({ page }) => {
  test.setTimeout(5 * 60 * 1_000)
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

      await page.getByRole('combobox', { name: 'Project' }).fill(railwayTargetNames.project)
      const projectOption = page.getByRole('option', {
        name: railwayTargetNames.project,
        exact: true,
      })
      await expect(projectOption).toBeVisible()
      const openPickerResults = await new AxeBuilder({ page })
        .withRules(['label-title-only'])
        .analyze()
      expect(openPickerResults.violations).toEqual([])
      await projectOption.click()
      await page.getByRole('combobox', { name: 'Environment' }).fill(config.expectedEnvironmentName)
      await page.getByRole('option', { name: config.expectedEnvironmentName, exact: true }).click()
      await page.getByRole('combobox', { name: 'Service' }).fill(railwayTargetNames.service)
      await page.getByRole('option', { name: railwayTargetNames.service, exact: true }).click()

      const deploymentStatus = page.getByRole('status', { name: 'Deployment status' })
      await expect(deploymentStatus.getByText('Success', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Spin down' }).click()
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toHaveAccessibleName('Spin down deployment?')
      spinDownAttempted = true
      await dialog.getByRole('button', { name: 'Spin down' }).click()
      await expect(deploymentStatus.getByText('Removed', { exact: true })).toBeVisible({
        timeout: 2 * 60 * 1_000,
      })
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
