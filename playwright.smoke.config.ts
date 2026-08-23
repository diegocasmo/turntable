import { defineConfig } from '@playwright/test'

const testOrigin = 'http://127.0.0.1:3100'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'production-smoke.spec.ts',
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: testOrigin,
  },
  webServer: {
    command: 'pnpm start',
    env: {
      PORT: '3100',
    },
    reuseExistingServer: false,
    url: testOrigin,
  },
})
