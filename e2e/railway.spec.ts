import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  railwayTargetNames,
  readRailwayE2EConfig,
  restoreRailwayE2ETarget,
  runWithRailwayE2ETarget,
} from './railway'

const minute = 60_000
const expectRailwayStatus = expect.configure({ timeout: 2 * minute })
test.describe.configure({ timeout: 8 * minute })
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

      const deploymentRegion = page.getByRole('region', { name: 'Deployment status' })
      const readDeploymentHeight = () => deploymentRegion.evaluate((node) => node.clientHeight)
      const stableDeploymentHeight = await readDeploymentHeight()
      const expectStatus = (name: string) =>
        expectRailwayStatus(deploymentRegion.getByRole('status').getByText(name, { exact: true }))
      const selectAction = async (name: 'Refresh' | 'Spin down' | 'Spin up') => {
        await deploymentRegion.getByRole('button', { name: 'Actions' }).click()
        await page.getByRole('menuitem', { name }).click()
      }
      const expectNoAxeViolations = async () =>
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

      await page.getByRole('combobox', { name: 'Project' }).fill(railwayTargetNames.project)
      const projectOption = page.getByRole('option', {
        name: railwayTargetNames.project,
        exact: true,
      })
      await expect(projectOption).toBeVisible()
      await projectOption.click()
      await page.getByRole('combobox', { name: 'Environment' }).fill(config.expectedEnvironmentName)
      await page.getByRole('option', { name: config.expectedEnvironmentName, exact: true }).click()
      await page.getByRole('combobox', { name: 'Service' }).fill(railwayTargetNames.service)
      await page.getByRole('option', { name: railwayTargetNames.service, exact: true }).click()

      await expectStatus('Success').toBeVisible()
      expect(await readDeploymentHeight()).toBe(stableDeploymentHeight)
      const actions = deploymentRegion.getByRole('button', { name: 'Actions' })
      await actions.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('menuitem', { name: 'Refresh' })).toBeFocused()
      await expectNoAxeViolations()
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('alertdialog')
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
      await expect(dialog).toHaveCSS('opacity', '1')
      await expectNoAxeViolations()
      await page.keyboard.press('Escape')
      await expect(actions).toBeFocused()
      await selectAction('Spin down')
      await expect(dialog).toHaveAccessibleName('Spin down deployment?')
      spinDownAttempted = true
      await dialog.getByRole('button', { name: 'Spin down' }).click()
      await expectStatus('Removed').toBeVisible()
      expect(await readDeploymentHeight()).toBe(stableDeploymentHeight)
      await selectAction('Spin up')
      await page.getByRole('alertdialog').getByRole('button', { name: 'Spin up' }).click()
      await expectStatus('Success').toBeVisible()
      await restoreRailwayE2ETarget(config)
      await selectAction('Refresh')
      await expectStatus('Success').toBeVisible()
      await expect
        .poll(() => [...new URL(page.url()).searchParams].sort())
        .toEqual(
          [
            ['environmentId', environmentId],
            ['projectId', projectId],
            ['serviceId', serviceId],
          ].sort(),
        )
    } finally {
      if (spinDownAttempted) await restoreRailwayE2ETarget(config)
    }
  })
})
