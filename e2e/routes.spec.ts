import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

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

  const response = await page.goto('/')
  const rawHtml = (await response?.body())?.toString() ?? ''

  await expect(page.getByLabel('Workspace token')).toBeVisible()

  const policy = response?.headers()['content-security-policy'] ?? ''
  const nonce = readNonce(policy)

  expect(nonce).toBeTruthy()
  expect(rawHtml).toContain(`nonce="${nonce}"`)
  expect(policy).toContain("frame-ancestors 'none'")
  expect(response?.headers()['referrer-policy']).toBe('no-referrer')
  expect(response?.headers()['x-content-type-options']).toBe('nosniff')

  const nextPolicy = (await page.request.get('/')).headers()['content-security-policy'] ?? ''
  const nextNonce = readNonce(nextPolicy)

  expect(nextNonce).toBeTruthy()
  expect(nextNonce).not.toBe(nonce)

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations).toEqual([])
  expect(browserErrors).toEqual([])
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
  await expect(page.getByRole('link', { name: 'Return to Turntable' })).toHaveAttribute('href', '/')

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations).toEqual([])
})

function readNonce(policy: string) {
  return policy.match(/script-src 'nonce-([^']+)'/)?.[1]
}
