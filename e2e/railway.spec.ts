import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { railwayTargetNames, readRailwayE2EConfig, runWithRailwayE2ETarget } from './railway'

const expectRailway = expect.configure({ timeout: 30_000 })

test('a user can navigate the configured Railway project and environment', async ({ page }) => {
  const config = readRailwayE2EConfig()
  const { environmentId, projectId } = config.target

  await runWithRailwayE2ETarget(config, async () => {
    await page.goto('/')
    await page.getByLabel('Railway API token').fill(config.token)
    await page.getByRole('button', { name: 'Connect to Railway' }).click()
    await expectRailway(page.getByRole('heading', { name: 'Choose a project' })).toBeVisible()
    await expectRailway(page).toHaveURL('/projects')
    expect(new URL(page.url()).searchParams.has('token')).toBe(false)

    await page.getByRole('searchbox', { name: 'Search projects' }).fill(railwayTargetNames.project)
    await page
      .getByRole('link', { name: `Select ${railwayTargetNames.project}`, exact: false })
      .click()
    await expectRailway(page).toHaveURL(`/projects/${projectId}/environments`)

    await page
      .getByRole('searchbox', { name: 'Search environments' })
      .fill(config.expectedEnvironmentName)
    await expectRailway(
      page.getByRole('link', { name: `Select ${config.expectedEnvironmentName}` }),
    ).toHaveAttribute('href', `/projects/${projectId}/environments/${environmentId}/services`)

    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  })
})
