import { loadEnv } from 'vite'
import { z } from 'zod'
import { readRailwayCurrentDeployment } from '@/deployment/read-current-deployment.server'
import { readRailwayDeploymentStatus } from '@/deployment/read-deployment-status.server'
import { formatDeploymentStatus } from '@/railway/deployment-status'
import { railwayHttpsUrlSchema } from '@/railway/url-schema'

const e2eEnvironmentSchema = z.object({
  RAILWAY_API_URL: railwayHttpsUrlSchema,
  RAILWAY_TEST_ENVIRONMENT_ID: z.string().min(1),
  RAILWAY_TEST_PROJECT_ID: z.string().min(1),
  RAILWAY_TEST_SERVICE_ID: z.string().min(1),
  RAILWAY_TEST_TOKEN: z.string().min(1),
})

export default async function setUpRailwayE2E() {
  const environment = loadEnv('development', process.cwd(), ['RAILWAY_API_URL', 'RAILWAY_TEST_'])
  const config = e2eEnvironmentSchema.parse(environment)
  const target = {
    environmentId: config.RAILWAY_TEST_ENVIRONMENT_ID,
    projectId: config.RAILWAY_TEST_PROJECT_ID,
    serviceId: config.RAILWAY_TEST_SERVICE_ID,
  }
  const deployment = await readRailwayCurrentDeployment(
    config.RAILWAY_TEST_TOKEN,
    config.RAILWAY_API_URL,
    target,
  )

  if (deployment === null) {
    throw new Error('The Railway E2E target has no deployment.')
  }
  const snapshot = await readRailwayDeploymentStatus(
    config.RAILWAY_TEST_TOKEN,
    config.RAILWAY_API_URL,
    deployment.id,
  )

  process.env.RAILWAY_TEST_ENVIRONMENT_ID = config.RAILWAY_TEST_ENVIRONMENT_ID
  process.env.RAILWAY_TEST_EXPECTED_STATUS = formatDeploymentStatus(snapshot.status)
  process.env.RAILWAY_TEST_PROJECT_ID = config.RAILWAY_TEST_PROJECT_ID
  process.env.RAILWAY_TEST_SERVICE_ID = config.RAILWAY_TEST_SERVICE_ID
  process.env.RAILWAY_TEST_TOKEN = config.RAILWAY_TEST_TOKEN
}
