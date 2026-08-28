import { expect, test } from '@playwright/test'
import {
  railwayTargetNames,
  readRailwayTargetConfig,
  restoreRailwayTarget,
  runWithRailwayTarget,
} from './railway-target'

const railwayOperationTimeout = 2 * 60_000
test.describe.configure({ timeout: 4 * railwayOperationTimeout })

test('a user can control the configured Railway service from the collection', async ({ page }) => {
  const config = readRailwayTargetConfig()
  const { environmentId, projectId } = config.target

  await runWithRailwayTarget(config, async () => {
    let spinDownAttempted = false

    try {
      await page.goto('/')
      await page.getByLabel('Railway API token').fill(config.token)
      await page.getByRole('button', { name: 'Connect to Railway' }).click()
      await expect(page.getByRole('heading', { name: 'Choose a project' })).toBeVisible()
      await expect(page).toHaveURL('/projects')
      expect(new URL(page.url()).searchParams.has('token')).toBe(false)

      await page
        .getByRole('searchbox', { name: 'Search projects' })
        .fill(railwayTargetNames.project)
      await page
        .getByRole('link', {
          name: `Select ${railwayTargetNames.project}`,
          exact: false,
        })
        .click()
      await expect(page).toHaveURL(`/projects/${projectId}/environments`)

      await page
        .getByRole('searchbox', { name: 'Search environments' })
        .fill(config.expectedEnvironmentName)
      await page.getByRole('link', { name: `Select ${config.expectedEnvironmentName}` }).click()
      await expect(page).toHaveURL(`/projects/${projectId}/environments/${environmentId}/services`)

      await page
        .getByRole('searchbox', { name: 'Search services' })
        .fill(railwayTargetNames.service)
      const serviceCard = page.getByRole('article', { name: railwayTargetNames.service })
      await expect(serviceCard.getByText('Success', { exact: true })).toBeVisible()

      const spinUp = serviceCard.getByRole('button', {
        name: `Spin up ${railwayTargetNames.service}`,
      })
      const spinDown = serviceCard.getByRole('button', {
        name: `Spin down ${railwayTargetNames.service}`,
      })

      await spinDown.click()
      const dialog = page.getByRole('alertdialog')
      spinDownAttempted = true
      await dialog.getByRole('button', { name: `Spin down ${railwayTargetNames.service}` }).click()
      await expect(serviceCard.getByText('No active deployment', { exact: true })).toBeVisible({
        timeout: railwayOperationTimeout,
      })

      await spinUp.click()
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: `Spin up ${railwayTargetNames.service}` })
        .click()
      await expect(serviceCard.getByText('Success', { exact: true })).toBeVisible({
        timeout: railwayOperationTimeout,
      })

      spinDownAttempted = false
    } finally {
      if (spinDownAttempted) await restoreRailwayTarget(config)
    }
  })
})
