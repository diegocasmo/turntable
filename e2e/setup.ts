import { loadEnv } from 'vite'
import { formatDeploymentStatus } from '@/deployment/format-deployment-status'
import { readRailwayCurrentDeployment } from '@/deployment/read-current-deployment.server'
import { checkRailwayTarget, loadRailwayE2EConfig } from '@/railway/check-target.server'

export default async function setUpRailwayE2E() {
  const environment = loadEnv('development', process.cwd(), ['RAILWAY_API_URL', 'RAILWAY_TEST_'])
  const config = loadRailwayE2EConfig(environment)

  await checkRailwayTarget(config)
  const deployment = await readRailwayCurrentDeployment(config.token, config.apiUrl, config)

  if (deployment === null) {
    throw new Error('The Railway E2E target has no deployment.')
  }

  process.env.RAILWAY_TEST_ENVIRONMENT_ID = config.environmentId
  process.env.RAILWAY_TEST_EXPECTED_STATUS = formatDeploymentStatus(deployment.status)
  process.env.RAILWAY_TEST_PROJECT_ID = config.projectId
  process.env.RAILWAY_TEST_SERVICE_ID = config.serviceId
  process.env.RAILWAY_TEST_TOKEN = config.token
}
