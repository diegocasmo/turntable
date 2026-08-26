import { loadEnv } from 'vite'
import { readDeploymentStreamState } from '@/deployment/event-stream'
import { subscribeToRailwayDeployment } from '@/deployment/stream-deployment-events.server'
import { serviceInstanceDeployMutation } from '@/gql/operations/service-instance-deploy'
import { createRailwayClient } from '@/railway/client.server'
import { railwayHttpsUrlSchema, railwayWebSocketUrlSchema } from '@/railway/url-schema'
import { readRailwayEnvironments } from '@/selection/read-environments.server'
import { readRailwayProjects } from '@/selection/read-projects.server'
import { readRailwayServices } from '@/selection/read-services.server'
import { z } from '@/zod'

const environmentSchema = z.object({
  RAILWAY_API_URL: railwayHttpsUrlSchema,
  RAILWAY_TEST_ENVIRONMENT_ID: z.string().min(1),
  RAILWAY_TEST_PROJECT_ID: z.string().min(1),
  RAILWAY_TEST_SERVICE_ID: z.string().min(1),
  RAILWAY_TEST_TOKEN: z.string().min(1),
  RAILWAY_WEBSOCKET_URL: railwayWebSocketUrlSchema,
})

const targetNames = { project: 'turntable-e2e', service: 'target' } as const
const terminalRestoreStatuses = new Set(['CRASHED', 'FAILED', 'REMOVED', 'SKIPPED'])

export function readRailwayE2EConfig() {
  const environment = environmentSchema.parse(
    loadEnv('development', process.cwd(), [
      'RAILWAY_API_URL',
      'RAILWAY_TEST_',
      'RAILWAY_WEBSOCKET_',
    ]),
  )

  return {
    apiUrl: environment.RAILWAY_API_URL,
    expectedEnvironmentName: process.env.CI ? 'ci' : 'local',
    target: {
      environmentId: environment.RAILWAY_TEST_ENVIRONMENT_ID,
      projectId: environment.RAILWAY_TEST_PROJECT_ID,
      serviceId: environment.RAILWAY_TEST_SERVICE_ID,
    },
    token: environment.RAILWAY_TEST_TOKEN,
    webSocketUrl: environment.RAILWAY_WEBSOCKET_URL,
  }
}

export type RailwayE2EConfig = ReturnType<typeof readRailwayE2EConfig>

const defaultGuardDependencies = {
  readEnvironments: readRailwayEnvironments,
  readProjects: readRailwayProjects,
  readServices: readRailwayServices,
}

type GuardDependencies = Readonly<typeof defaultGuardDependencies>

function includesOption(
  options: readonly Readonly<{ id: string; name: string }>[],
  id: string,
  name: string,
) {
  return options.some((option) => option.id === id && option.name === name)
}

export async function runWithRailwayE2ETarget<Value>(
  config: RailwayE2EConfig,
  run: () => Promise<Value>,
  dependencies: GuardDependencies = defaultGuardDependencies,
) {
  const { apiUrl, expectedEnvironmentName, target, token } = config
  const [projects, environments, services] = await Promise.all([
    dependencies.readProjects(token, apiUrl),
    dependencies.readEnvironments(token, apiUrl, target.projectId),
    dependencies.readServices(token, apiUrl, target.projectId, target.environmentId),
  ])
  const knownTarget =
    includesOption(projects, target.projectId, targetNames.project) &&
    includesOption(environments, target.environmentId, expectedEnvironmentName) &&
    includesOption(services, target.serviceId, targetNames.service)

  if (!knownTarget) {
    throw new Error(
      `The Railway E2E target is not ${targetNames.project}/${expectedEnvironmentName}/${targetNames.service}.`,
    )
  }

  return run()
}

export async function restoreRailwayE2ETarget(config: RailwayE2EConfig) {
  const client = createRailwayClient({ apiUrl: config.apiUrl })
  const result = await client.request({
    document: serviceInstanceDeployMutation,
    token: config.token,
    variables: {
      environmentId: config.target.environmentId,
      serviceId: config.target.serviceId,
    },
  })
  const deploymentId = z.string().min(1).parse(result.serviceInstanceDeployV2)
  const subscription = subscribeToRailwayDeployment(deploymentId, config.token, config.webSocketUrl)
  const events = subscription.events[Symbol.asyncIterator]()
  let nextEvent = events.next()

  try {
    await subscription.subscribed
    while (true) {
      const event = await nextEvent
      if (event.done) {
        throw new Error('The Railway E2E cleanup stream ended before the target was running.')
      }
      const status = readDeploymentStreamState(event.value.deployment).status
      if (status === 'SUCCESS') return
      if (terminalRestoreStatuses.has(status)) {
        throw new Error(`The Railway E2E target reached ${status} during cleanup.`)
      }
      nextEvent = events.next()
    }
  } finally {
    await subscription.close()
  }
}
