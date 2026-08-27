import { environmentServicesQuery } from '@/gql/operations/environment-services'
import { createRailwayClient } from '@/railway/client.server'
import { deploymentStatusSchema } from '@/railway/deployment-status'
import {
  railwayConnectionPageSize,
  readAllConnectionNodes,
} from '@/selection/read-all-connection-nodes.server'

type FetchRequest = (request: Request) => Promise<Response>

export async function readRailwayServices(
  token: string,
  apiUrl: string,
  projectId: string,
  environmentId: string,
  fetchRequest: FetchRequest = globalThis.fetch,
  signal?: AbortSignal,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const readPage = (after: string | null = null) =>
    client.request({
      document: environmentServicesQuery,
      signal,
      token,
      variables: { after, environmentId, first: railwayConnectionPageSize, projectId },
    })
  const firstPage = await readPage()
  const services = await readAllConnectionNodes(
    firstPage.environment.serviceInstances,
    async (after) => {
      const page = await readPage(after)
      return page.environment.serviceInstances
    },
  )

  return services.map((service) => {
    return {
      id: service.id,
      name: service.name,
      deployment: service.latestDeployment
        ? {
            id: service.latestDeployment.id,
            status: deploymentStatusSchema.parse(service.latestDeployment.status),
          }
        : null,
    }
  })
}
