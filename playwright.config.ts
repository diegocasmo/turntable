import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'
import { readConfig } from './src/config.server.ts'

const testEnvironment = loadEnv('development', process.cwd(), [
  'APP_ORIGIN',
  'RAILWAY_API_URL',
  'SESSION_SECRET',
])
const testOrigin = readConfig(testEnvironment).appOrigin

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'build.spec.ts',
  forbidOnly: Boolean(process.env.CI),
  ...(process.env.CI ? { workers: 1 } : {}),
  use: {
    baseURL: testOrigin,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'routes',
      testMatch: 'routes.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'railway',
      testMatch: 'railway.spec.ts',
      use: { ...devices['Desktop Chrome'], trace: 'off' },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    env: testEnvironment,
    reuseExistingServer: !process.env.CI,
    url: testOrigin,
  },
})
