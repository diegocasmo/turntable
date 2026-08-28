import { apiTokenWorkspacesQuery } from '@/gql/operations/api-token-workspaces'
import { projectsQuery } from '@/gql/operations/project-list'
import { createRailwayClient } from '@/railway/client.server'
import {
  railwayConnectionPageSize,
  readAllConnectionNodes,
} from '@/selection/read-all-connection-nodes.server'

export async function readRailwayProjects(
  token: string,
  apiUrl: string,
  fetchRequest: (request: Request) => Promise<Response> = globalThis.fetch,
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
    tokenContext.apiToken.workspaces.map((workspace) =>
      readAllConnectionNodes(async (after) => {
        const page = await client.request({
          document: projectsQuery,
          signal,
          token,
          variables: { after, first: railwayConnectionPageSize, workspaceId: workspace.id },
        })
        return page.projects
      }),
    ),
  )

  return workspaces.flat()
}
