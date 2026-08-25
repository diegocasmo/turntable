import { projectsQuery } from '@/gql/operations/projects'
import { createRailwayClient } from '@/railway/client.server'
import { railwayConnectionPageSize, readConnectionNodes } from '@/selection/read-connection.server'

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
  return readConnectionNodes(firstPage.projects, async (after) => {
    const page = await readPage(after)
    return page.projects
  })
}
