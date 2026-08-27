import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  railwayTargetNames,
  readRailwayE2EConfig,
  restoreRailwayE2ETarget,
  runWithRailwayE2ETarget,
} from './railway'

const minute = 60_000
const expectRailway = expect.configure({ timeout: 30_000 })
test.describe.configure({ timeout: 8 * minute })

test('a user can control the configured Railway service from the collection', async ({ page }) => {
  const config = readRailwayE2EConfig()
  const { environmentId, projectId } = config.target

  await runWithRailwayE2ETarget(config, async () => {
    let spinDownAttempted = false

    try {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/')
      await page.getByLabel('Railway API token').fill(config.token)
      await page.getByRole('button', { name: 'Connect to Railway' }).click()
      await expectRailway(page.getByRole('heading', { name: 'Choose a project' })).toBeVisible()
      expect(new URL(page.url()).searchParams.has('token')).toBe(false)

      const expectNoAxeViolations = async () =>
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
      const expectUsableViewport = async () => {
        const layout = await page.evaluate(() => ({
          height: document.body.getBoundingClientRect().height,
          scrollWidth: document.documentElement.scrollWidth,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        }))
        expect(layout.height).toBeGreaterThanOrEqual(layout.viewportHeight)
        expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth)
      }

      await expectNoAxeViolations()
      await expectUsableViewport()
      const environmentBreadcrumb = page.getByRole('button', { name: 'Environment' })
      await environmentBreadcrumb.hover()
      await expect(page.getByRole('tooltip')).toHaveText('Select a project first', {
        timeout: 300,
      })
      await page
        .getByRole('searchbox', { name: 'Search projects' })
        .fill(railwayTargetNames.project)
      await expect(page.getByRole('button', { name: 'Clear project search' })).toHaveCount(1)
      const projectCardLink = page.getByRole('link', {
        name: `Select ${railwayTargetNames.project}`,
        exact: false,
      })
      await projectCardLink.focus()
      await page.keyboard.press('Enter')
      await expectRailway(page).toHaveURL(`/projects/${projectId}/environments`)

      await expectNoAxeViolations()
      await page
        .getByRole('searchbox', { name: 'Search environments' })
        .fill(config.expectedEnvironmentName)
      const environmentCardLink = page.getByRole('link', {
        name: `Select ${config.expectedEnvironmentName}`,
      })
      await environmentCardLink.focus()
      await page.keyboard.press('Enter')
      await expectRailway(page).toHaveURL(
        `/projects/${projectId}/environments/${environmentId}/services`,
      )

      await expectNoAxeViolations()
      const serviceSearch = page.getByRole('searchbox', { name: 'Search services' })
      await serviceSearch.fill(railwayTargetNames.service)
      await expectRailway(page).toHaveURL(
        `/projects/${projectId}/environments/${environmentId}/services?q=${railwayTargetNames.service}`,
      )
      const serviceCard = page.getByRole('article', { name: railwayTargetNames.service })
      await expect(serviceCard).toBeVisible()
      await expect(serviceCard.getByText('Success', { exact: true })).toBeVisible()
      await expectNoAxeViolations()
      await expectUsableViewport()

      const spinUp = serviceCard.getByRole('button', {
        name: `Spin up ${railwayTargetNames.service}`,
      })
      const spinDown = serviceCard.getByRole('button', {
        name: `Spin down ${railwayTargetNames.service}`,
      })
      expect((await spinUp.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      expect((await spinDown.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      await expect(serviceCard.getByRole('button', { name: /Actions for/ })).toHaveCount(0)

      await spinDown.focus()
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toHaveAccessibleName('Spin down deployment?')
      spinDownAttempted = true
      await dialog.getByRole('button', { name: `Spin down ${railwayTargetNames.service}` }).click()
      await expectRailway(dialog).toHaveCount(0)
      await expectRailway(
        serviceCard.getByText('No active deployment', { exact: true }),
      ).toBeVisible()

      await spinUp.click()
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: `Spin up ${railwayTargetNames.service}` })
        .click()
      await expectRailway(page.getByRole('alertdialog')).toHaveCount(0)
      await expectRailway(serviceCard.getByText('Success', { exact: true })).toBeVisible()

      spinDownAttempted = false
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.reload()
      await expect(serviceSearch).toHaveValue(railwayTargetNames.service)
      await expectRailway(serviceCard.getByText('Success', { exact: true })).toBeVisible()
      await expectUsableViewport()
    } finally {
      if (spinDownAttempted) await restoreRailwayE2ETarget(config)
    }
  })
})
