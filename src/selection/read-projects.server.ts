import { projectsQuery } from '@/gql/operations/projects'
import { createRailwayClient } from '@/railway/client.server'
import {
  railwayConnectionPageSize,
  readAllConnectionNodes,
} from '@/selection/read-all-connection-nodes.server'

type FetchRequest = (request: Request) => Promise<Response>

export async function readRailwayProjects(
  token: string,
  apiUrl: string,
  fetchRequest: FetchRequest = globalThis.fetch,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const readPage = (after: string | null = null) =>
    client.request({
      document: projectsQuery,
      token,
      variables: { after, first: railwayConnectionPageSize },
    })
  const firstPage = await readPage()
  return readAllConnectionNodes(firstPage.projects, async (after) => {
    const page = await readPage(after)
    return page.projects
  })
}
