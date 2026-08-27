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
      await page
        .getByRole('searchbox', { name: 'Search projects' })
        .fill(railwayTargetNames.project)
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
      await expect(page).toHaveURL(
        `/projects/${projectId}/environments/${environmentId}/services?q=${railwayTargetNames.service}`,
      )
      const serviceCard = page.getByRole('article', { name: railwayTargetNames.service })
      await expect(serviceCard).toBeVisible()
      await expect(serviceCard.getByText('Success', { exact: true })).toBeVisible()
      await expectNoAxeViolations()
      await expectUsableViewport()

      const actions = serviceCard.getByRole('button', {
        name: `Actions for ${railwayTargetNames.service}`,
      })
      await actions.focus()
      expect((await actions.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      await page.keyboard.press('Enter')
      await expect(page.getByRole('menuitem', { name: 'Spin up' })).toBeFocused()
      const menuBox = await page.getByRole('menu').boundingBox()
      expect(menuBox?.x).toBeGreaterThanOrEqual(0)
      expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThanOrEqual(390)
      await expect(page.getByRole('menuitem', { name: 'Refresh' })).toHaveCount(0)
      await page.keyboard.press('Escape')
      await expect(actions).toBeFocused()

      await actions.click()
      await page.getByRole('menuitem', { name: 'Spin down' }).click()
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toHaveAccessibleName('Spin down deployment?')
      spinDownAttempted = true
      await dialog.getByRole('button', { name: 'Spin down' }).click()
      await expectRailway(dialog).toHaveCount(0)

      await actions.click()
      await page.getByRole('menuitem', { name: 'Spin up' }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Spin up' }).click()
      await expectRailway(page.getByRole('alertdialog')).toHaveCount(0)

      await restoreRailwayE2ETarget(config)
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
