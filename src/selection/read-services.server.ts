import { environmentServicesQuery } from '@/gql/operations/environment-services'
import { createRailwayClient } from '@/railway/client.server'
import { deploymentStatusSchema } from '@/railway/deployment-status'
import {
  railwayConnectionPageSize,
  readAllConnectionNodes,
} from '@/selection/read-all-connection-nodes.server'

export async function readRailwayServices(
  token: string,
  apiUrl: string,
  projectId: string,
  environmentId: string,
  fetchRequest: (request: Request) => Promise<Response> = globalThis.fetch,
  signal?: AbortSignal,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const services = await readAllConnectionNodes(async (after) => {
    const page = await client.request({
      document: environmentServicesQuery,
      signal,
      token,
      variables: { after, environmentId, first: railwayConnectionPageSize, projectId },
    })
    return page.environment.serviceInstances
  })

  return services.map((service) => ({
    id: service.id,
    name: service.name,
    deployment: service.latestDeployment
      ? {
          id: service.latestDeployment.id,
          status: deploymentStatusSchema.parse(service.latestDeployment.status),
        }
      : null,
  }))
}
