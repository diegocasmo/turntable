import { loadEnv } from 'vite'
import { deploymentStatusSnapshotQuery } from '@/gql/operations/deployment-status-snapshot'
import { serviceInstanceDeployMutation } from '@/gql/operations/service-instance-deploy'
import { createRailwayClient } from '@/railway/client.server'
import { type DeploymentStatus, deploymentStatusSchema } from '@/railway/deployment-status'
import { railwayHttpsUrlSchema } from '@/railway/url-schema'
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
})

export const railwayTargetNames = { project: 'turntable-e2e', service: 'target' } as const
const terminalRestoreStatuses = new Set<DeploymentStatus>([
  'CRASHED',
  'FAILED',
  'REMOVED',
  'SKIPPED',
])
const restoreDelays = [1_000, 2_000, 4_000] as const
const restoreSteadyDelay = 5_000
const restoreTimeout = 2 * 60_000

export function readRailwayE2EConfig() {
  const environment = environmentSchema.parse(
    loadEnv('development', process.cwd(), ['RAILWAY_API_URL', 'RAILWAY_TEST_']),
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
  }
}

export type RailwayE2EConfig = ReturnType<typeof readRailwayE2EConfig>

const defaultGuardDependencies = {
  readEnvironments: readRailwayEnvironments,
  readProjects: readRailwayProjects,
  readServices: readRailwayServices,
}

type GuardDependencies = Readonly<typeof defaultGuardDependencies>

export async function runWithRailwayE2ETarget<Value>(
  config: RailwayE2EConfig,
  run: () => Promise<Value>,
  dependencies: GuardDependencies = defaultGuardDependencies,
) {
  const { apiUrl, expectedEnvironmentName, target, token } = config
  const projects = await dependencies.readProjects(token, apiUrl)
  const project = projects.find(({ id }) => id === target.projectId)
  const environments = project
    ? await dependencies.readEnvironments(token, apiUrl, target.projectId)
    : []
  const environment = environments.find(({ id }) => id === target.environmentId)
  const services = environment
    ? await dependencies.readServices(token, apiUrl, target.projectId, target.environmentId)
    : []
  const service = services.find(({ id }) => id === target.serviceId)
  const knownTarget =
    project?.name === railwayTargetNames.project &&
    environment?.name === expectedEnvironmentName &&
    service?.name === railwayTargetNames.service

  if (!knownTarget) {
    throw new Error(
      `The Railway E2E target is not ${railwayTargetNames.project}/${expectedEnvironmentName}/${railwayTargetNames.service}.`,
    )
  }

  return run()
}

async function spinUpRailwayRestoreDeployment(config: RailwayE2EConfig) {
  const client = createRailwayClient({ apiUrl: config.apiUrl })
  const result = await client.request({
    document: serviceInstanceDeployMutation,
    token: config.token,
    variables: {
      environmentId: config.target.environmentId,
      serviceId: config.target.serviceId,
    },
  })
  return z.string().min(1).parse(result.serviceInstanceDeployV2)
}

async function readRailwayRestoreStatus(config: RailwayE2EConfig, deploymentId: string) {
  const client = createRailwayClient({ apiUrl: config.apiUrl })
  const result = await client.request({
    document: deploymentStatusSnapshotQuery,
    token: config.token,
    variables: { deploymentId },
  })
  return deploymentStatusSchema.parse(result.deployment.status)
}

function waitForRestoreDelay(delay: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delay))
}

const defaultRestoreDependencies = {
  readNow: Date.now,
  readStatus: readRailwayRestoreStatus,
  spinUp: spinUpRailwayRestoreDeployment,
  wait: waitForRestoreDelay,
}

type RestoreDependencies = Readonly<typeof defaultRestoreDependencies>

export async function restoreRailwayE2ETarget(
  config: RailwayE2EConfig,
  dependencies: RestoreDependencies = defaultRestoreDependencies,
) {
  const deploymentId = await dependencies.spinUp(config)
  const startedAt = dependencies.readNow()
  let attempt = 0

  while (dependencies.readNow() - startedAt < restoreTimeout) {
    const delay = restoreDelays[attempt] ?? restoreSteadyDelay
    if (dependencies.readNow() - startedAt + delay > restoreTimeout) break
    await dependencies.wait(delay)
    const status = await dependencies.readStatus(config, deploymentId).catch(() => null)
    if (status === 'SUCCESS') return
    if (status !== null && terminalRestoreStatuses.has(status)) {
      throw new Error(`The Railway E2E target reached ${status} during cleanup.`)
    }
    attempt += 1
  }

  throw new Error('The Railway E2E cleanup did not restore the target within two minutes.')
}
