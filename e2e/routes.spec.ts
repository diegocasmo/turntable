import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    turntableCspViolations: string[]
  }
}

test('the token route is accessible', async ({ page }) => {
  const browserErrors: string[] = []
  const recordBrowserError = (message: string) => {
    const normalizedMessage = message.toLowerCase()

    if (
      normalizedMessage.includes('content security policy') ||
      normalizedMessage.includes('hydrated but some attributes')
    ) {
      browserErrors.push(message)
    }
  }

  page.on('console', (message) => recordBrowserError(message.text()))
  page.on('pageerror', (error) => recordBrowserError(error.message))
  await page.addInitScript(() => {
    window.turntableCspViolations = []
    document.addEventListener('securitypolicyviolation', (event) => {
      window.turntableCspViolations.push(`${event.effectiveDirective}: ${event.blockedURI}`)
    })
  })

  const response = await page.goto('/')
  const rawHtml = (await response?.body())?.toString() ?? ''

  await expect(page.getByLabel('Railway API token')).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/connect')
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/projects')

  const policy = response?.headers()['content-security-policy'] ?? ''
  const nonce = readNonce(policy)

  expect(nonce).toBeTruthy()
  expect(rawHtml).toContain(`nonce="${nonce}"`)
  expect(policy).toContain("frame-ancestors 'none'")
  expect(policy).not.toContain("'unsafe-eval'")
  expect(response?.headers()['referrer-policy']).toBe('no-referrer')
  expect(response?.headers()['x-content-type-options']).toBe('nosniff')

  const nextPolicy = (await page.request.get('/')).headers()['content-security-policy'] ?? ''
  const nextNonce = readNonce(nextPolicy)

  expect(nextNonce).toBeTruthy()
  expect(nextNonce).not.toBe(nonce)

  const results = await new AxeBuilder({ page }).analyze()
  const cspViolations = await page.evaluate(() => window.turntableCspViolations)

  expect(results.violations).toEqual([])
  expect(browserErrors).toEqual([])
  expect(cspViolations).toEqual([])
})

test('a signed-out selection route keeps its return address', async ({ page }) => {
  await page.goto('/projects?projectId=project-1')

  await expect(page.getByLabel('Railway API token')).toBeVisible()
  const location = new URL(page.url())
  expect(location.pathname).toBe('/connect')
  expect(location.searchParams.get('redirect')).toBe('/projects?projectId=project-1')
})

test('the health check returns only ok', async ({ request }) => {
  const response = await request.get('/healthz')

  expect(response.status()).toBe(200)
  expect(await response.text()).toBe('ok')
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
})

test('an unknown route is accessible and returns 404', async ({ page }) => {
  const response = await page.goto('/unknown-route')

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Return to Turntable' })).toHaveAttribute(
    'href',
    '/projects',
  )

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations).toEqual([])
})

function readNonce(policy: string) {
  return policy.match(/script-src 'nonce-([^']+)'/)?.[1]
}
