import { expect, test } from '@playwright/test'

test('Nitro serves the token form from the production build', async ({ request }) => {
  const response = await request.get('/')

  expect(response).toBeOK()
  expect(response.headers()['content-type']).toContain('text/html')
  expect(await response.text()).toContain('Connect to Railway')

  const healthResponse = await request.get('/healthz')

  expect(healthResponse).toBeOK()
  expect(await healthResponse.text()).toBe('ok')
})
