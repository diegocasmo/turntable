import { z } from 'zod'
import { railwayHostname } from '../config.server.ts'
import { railwaySmokeQuery } from '../gql/operations/railway-smoke.ts'
import { createRailwayClient } from './client.server.ts'

const railwayHostnamePattern = new RegExp(`^${railwayHostname.replaceAll('.', '[.]')}$`)

const smokeResponseSchema = z.object({
  environment: z.object({
    id: z.string(),
    name: z.string(),
    projectId: z.string(),
    serviceInstances: z.object({
      edges: z.array(
        z.object({ node: z.object({ serviceId: z.string(), serviceName: z.string() }) }),
      ),
    }),
  }),
  project: z.object({ id: z.string(), name: z.string() }),
})

const smokeEnvironmentSchema = z.object({
  RAILWAY_API_URL: z.url({
    hostname: railwayHostnamePattern,
    protocol: /^https$/,
    error: `must use https and ${railwayHostname}`,
  }),
  RAILWAY_TEST_ENVIRONMENT_ID: z.string().min(1),
  RAILWAY_TEST_PROJECT_ID: z.string().min(1),
  RAILWAY_TEST_SERVICE_ID: z.string().min(1),
  RAILWAY_TEST_TOKEN: z.string().min(1),
})

type Environment = Readonly<Record<string, string | undefined>>

export function loadRailwaySmokeConfig(environment: Environment = process.env) {
  const result = smokeEnvironmentSchema.safeParse(environment)

  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))].sort()
    throw new Error(`Invalid Railway smoke configuration: ${names.join(', ')}`)
  }

  return {
    apiUrl: result.data.RAILWAY_API_URL,
    environmentId: result.data.RAILWAY_TEST_ENVIRONMENT_ID,
    projectId: result.data.RAILWAY_TEST_PROJECT_ID,
    serviceId: result.data.RAILWAY_TEST_SERVICE_ID,
    token: result.data.RAILWAY_TEST_TOKEN,
  }
}

type RailwaySmokeConfig = ReturnType<typeof loadRailwaySmokeConfig>

export async function checkRailwayTarget(config: RailwaySmokeConfig) {
  const client = createRailwayClient({ apiUrl: config.apiUrl })
  const data = await client.request({
    dataSchema: smokeResponseSchema,
    query: railwaySmokeQuery,
    token: config.token,
    variables: { environmentId: config.environmentId, projectId: config.projectId },
  })
  const service = data.environment.serviceInstances.edges.find(
    (edge) => edge.node.serviceId === config.serviceId,
  )

  if (data.project.id !== config.projectId || data.environment.projectId !== config.projectId) {
    throw new Error('The Railway smoke target does not match the configured project.')
  }

  if (data.environment.id !== config.environmentId) {
    throw new Error('The Railway smoke target does not match the configured environment.')
  }

  if (service === undefined) {
    throw new Error('The Railway smoke target does not contain the configured service.')
  }

  return {
    environment: { id: data.environment.id, name: data.environment.name },
    project: { id: data.project.id, name: data.project.name },
    service: { id: service.node.serviceId, name: service.node.serviceName },
  }
}
