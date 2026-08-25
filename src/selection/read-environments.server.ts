import { projectEnvironmentsQuery } from '@/gql/operations/project-environments'
import { createRailwayClient } from '@/railway/client.server'
import {
  railwayConnectionPageSize,
  readAllConnectionNodes,
} from '@/selection/read-all-connection-nodes.server'

type FetchRequest = (request: Request) => Promise<Response>

export async function readRailwayEnvironments(
  token: string,
  apiUrl: string,
  projectId: string,
  fetchRequest: FetchRequest = globalThis.fetch,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const readPage = (after: string | null = null) =>
    client.request({
      document: projectEnvironmentsQuery,
      token,
      variables: { after, first: railwayConnectionPageSize, projectId },
    })
  const firstPage = await readPage()
  return readAllConnectionNodes(firstPage.project.environments, async (after) => {
    const page = await readPage(after)
    return page.project.environments
  })
}
