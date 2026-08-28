import { projectDetailQuery } from '@/gql/operations/project-detail'
import { createRailwayClient } from '@/railway/client.server'
import { RailwayGraphQLError } from '@/railway/errors'

export async function readRailwayProject(
  token: string,
  apiUrl: string,
  projectId: string,
  fetchRequest: (request: Request) => Promise<Response> = globalThis.fetch,
  signal?: AbortSignal,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })

  try {
    const result = await client.request({
      document: projectDetailQuery,
      signal,
      token,
      variables: { projectId },
    })
    return result.project
  } catch (error) {
    if (error instanceof RailwayGraphQLError && error.isNotFound) return null
    throw error
  }
}
