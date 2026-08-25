import { environmentServicesQuery } from '@/gql/operations/environment-services'
import { createRailwayClient } from '@/railway/client.server'
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
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const readPage = (after: string | null = null) =>
    client.request({
      document: environmentServicesQuery,
      token,
      variables: { after, environmentId, first: railwayConnectionPageSize, projectId },
    })
  const firstPage = await readPage()
  return readAllConnectionNodes(firstPage.environment.serviceInstances, async (after) => {
    const page = await readPage(after)
    return page.environment.serviceInstances
  })
}
