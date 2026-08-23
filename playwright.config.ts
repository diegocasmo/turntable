import { defineConfig, devices } from '@playwright/test'

const testScheme = 'http'
const testOrigin = `${testScheme}://127.0.0.1:3000`
const testEnvironment = {
  APP_ORIGIN: testOrigin,
  NODE_ENV: 'test',
  RAILWAY_API_URL: 'http://127.0.0.1:4000/graphql/v2',
  RAILWAY_WEBSOCKET_URL: 'ws://127.0.0.1:4000/graphql/v2',
  SESSION_SECRET: Buffer.alloc(32, 1).toString('base64'),
}

export default defineConfig({
  testDir: './e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  use: {
    baseURL: testOrigin,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    env: testEnvironment,
    reuseExistingServer: !process.env.CI,
    url: testOrigin,
  },
})
