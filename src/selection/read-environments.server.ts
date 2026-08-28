import { environmentsQuery } from '@/gql/operations/environment-list'
import { createRailwayClient } from '@/railway/client.server'
import {
  railwayConnectionPageSize,
  readAllConnectionNodes,
} from '@/selection/read-all-connection-nodes.server'

export async function readRailwayEnvironments(
  token: string,
  apiUrl: string,
  projectId: string,
  fetchRequest: (request: Request) => Promise<Response> = globalThis.fetch,
  signal?: AbortSignal,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  return readAllConnectionNodes(async (after) => {
    const page = await client.request({
      document: environmentsQuery,
      signal,
      token,
      variables: { after, first: railwayConnectionPageSize, projectId },
    })
    return page.project.environments
  })
}
