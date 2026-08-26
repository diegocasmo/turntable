import { randomBytes } from 'node:crypto'
import { defineConfig } from '@playwright/test'
import { railwayHostname } from '@/railway/url-schema'

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
      APP_ORIGIN: 'https://turntable.test',
      PORT: '3100',
      RAILWAY_API_URL: `https://${railwayHostname}`,
      RAILWAY_WEBSOCKET_URL: `wss://${railwayHostname}`,
      SESSION_SECRET: randomBytes(32).toString('base64'),
    },
    reuseExistingServer: false,
    url: testOrigin,
  },
})
