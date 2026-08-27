import { environmentDetailQuery } from '@/gql/operations/environment-detail'
import { createRailwayClient } from '@/railway/client.server'
import { RailwayGraphQLError } from '@/railway/errors'

export async function readRailwayEnvironment(
  token: string,
  apiUrl: string,
  projectId: string,
  environmentId: string,
  fetchRequest: (request: Request) => Promise<Response> = globalThis.fetch,
  signal?: AbortSignal,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })

  try {
    const result = await client.request({
      document: environmentDetailQuery,
      signal,
      token,
      variables: { environmentId, projectId },
    })
    return result.environment
  } catch (error) {
    if (error instanceof RailwayGraphQLError && error.isNotFound) return null
    throw error
  }
}
