import { z } from 'zod'
import { railwayE2ETargetQuery } from '@/gql/operations/railway-e2e-target'
import { createRailwayClient } from '@/railway/client.server'
import { railwayHttpsUrlSchema } from '@/railway/url-schema'

const e2eEnvironmentSchema = z.object({
  RAILWAY_API_URL: railwayHttpsUrlSchema,
  RAILWAY_TEST_ENVIRONMENT_ID: z.string().min(1),
  RAILWAY_TEST_PROJECT_ID: z.string().min(1),
  RAILWAY_TEST_SERVICE_ID: z.string().min(1),
  RAILWAY_TEST_TOKEN: z.string().min(1),
})

type Environment = Readonly<Record<string, string | undefined>>

export function loadRailwayE2EConfig(environment: Environment = process.env) {
  const result = e2eEnvironmentSchema.safeParse(environment)

  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))].sort()
    throw new Error(`Invalid Railway E2E configuration: ${names.join(', ')}`)
  }

  return {
    apiUrl: result.data.RAILWAY_API_URL,
    environmentId: result.data.RAILWAY_TEST_ENVIRONMENT_ID,
    projectId: result.data.RAILWAY_TEST_PROJECT_ID,
    serviceId: result.data.RAILWAY_TEST_SERVICE_ID,
    token: result.data.RAILWAY_TEST_TOKEN,
  }
}

type RailwayE2EConfig = ReturnType<typeof loadRailwayE2EConfig>

export async function checkRailwayTarget(config: RailwayE2EConfig) {
  const client = createRailwayClient({ apiUrl: config.apiUrl })
  const data = await client.request({
    document: railwayE2ETargetQuery,
    token: config.token,
    variables: { environmentId: config.environmentId, projectId: config.projectId },
  })
  const service = data.environment.serviceInstances.edges.find(
    (edge) => edge.node.serviceId === config.serviceId,
  )

  if (data.project.id !== config.projectId || data.environment.projectId !== config.projectId) {
    throw new Error('The Railway E2E target does not match the configured project.')
  }

  if (data.environment.id !== config.environmentId) {
    throw new Error('The Railway E2E target does not match the configured environment.')
  }

  if (service === undefined) {
    throw new Error('The Railway E2E target does not contain the configured service.')
  }

  return {
    environment: { id: data.environment.id, name: data.environment.name },
    project: { id: data.project.id, name: data.project.name },
    service: { id: service.node.serviceId, name: service.node.serviceName },
  }
}
