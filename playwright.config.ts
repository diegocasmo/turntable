import { defineConfig, devices } from '@playwright/test'

const testScheme = 'http'
const testOrigin = `${testScheme}://127.0.0.1:3000`

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'production-smoke.spec.ts',
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
    command: 'pnpm dev --mode e2e',
    reuseExistingServer: !process.env.CI,
    url: testOrigin,
  },
})
