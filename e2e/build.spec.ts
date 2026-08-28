import { expect, test } from '@playwright/test'

test('the production build starts and serves Turntable', async ({ request }) => {
  const response = await request.get('/')

  expect(response).toBeOK()
  expect(response.headers()['content-type']).toContain('text/html')
  expect(await response.text()).toContain('Connect to Railway')

  const iconResponse = await request.get('/turntable.svg')

  expect(iconResponse).toBeOK()
  expect(iconResponse.headers()['content-type']).toContain('image/svg+xml')

  const healthResponse = await request.get('/healthz')

  expect(healthResponse).toBeOK()
  expect(await healthResponse.text()).toBe('ok')
})
