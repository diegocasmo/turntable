import { apiTokenWorkspacesQuery } from '@/gql/operations/api-token-workspaces'
import { selectionProjectsQuery } from '@/gql/operations/selection-projects'
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
  signal?: AbortSignal,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const tokenContext = await client.request({
    document: apiTokenWorkspacesQuery,
    signal,
    token,
    variables: {},
  })

  const workspaces = await Promise.all(
    tokenContext.apiToken.workspaces.map(async (workspace) => {
      const readPage = (after: string | null = null) =>
        client.request({
          document: selectionProjectsQuery,
          signal,
          token,
          variables: { after, first: railwayConnectionPageSize, workspaceId: workspace.id },
        })
      const firstPage = await readPage()
      return readAllConnectionNodes(firstPage.projects, async (after) => {
        const page = await readPage(after)
        return page.projects
      })
    }),
  )

  return workspaces.flat()
}
