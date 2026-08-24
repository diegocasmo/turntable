import { defineConfig } from '@playwright/test'
import { loadEnv } from 'vite'
import { railwayHostname } from './src/railway/url-schema'

const testOrigin = 'http://127.0.0.1:3100'
const testEnvironment = loadEnv('e2e', process.cwd(), '')

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
      ...testEnvironment,
      APP_ORIGIN: 'https://turntable.test',
      PORT: '3100',
      RAILWAY_API_URL: `https://${railwayHostname}`,
      RAILWAY_WEBSOCKET_URL: `wss://${railwayHostname}`,
    },
    reuseExistingServer: false,
    url: testOrigin,
  },
})
