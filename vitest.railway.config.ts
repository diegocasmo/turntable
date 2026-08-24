import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const environment = loadEnv('development', process.cwd(), ['RAILWAY_API_URL', 'RAILWAY_TEST_'])

export default defineConfig({
  test: {
    env: environment,
    environment: 'node',
    include: ['integration/**/*.test.ts'],
  },
})
