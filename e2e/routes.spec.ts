import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    turntableCspViolations: string[]
  }
}

test('the signed-out page renders with its security policy', async ({ page }) => {
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
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/turntable.svg')
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

  const cspViolations = await page.evaluate(() => window.turntableCspViolations)

  expect(browserErrors).toEqual([])
  expect(cspViolations).toEqual([])
})

function readNonce(policy: string) {
  return policy.match(/script-src 'nonce-([^']+)'/)?.[1]
}
