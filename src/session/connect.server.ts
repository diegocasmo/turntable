import { apiTokenWorkspacesQuery } from '@/gql/operations/api-token-workspaces'
import { createRailwayClient } from '@/railway/client.server'
import {
  checkRailwayUnauthorized,
  RailwayGraphQLError,
  RailwayRateLimitError,
} from '@/railway/errors'
import { rejectedRailwayTokenMessage } from '@/session/connection-errors'
import { writeSession } from '@/session/cookie.server'

export class SessionConnectionError extends Error {
  override readonly name = 'SessionConnectionError'
}

type FetchRequest = (request: Request) => Promise<Response>

type SessionConnectionConfig = Readonly<{
  railwayApiUrl: string
  sessionSecret: string
}>

export async function connectRailwaySession(
  token: string,
  config: SessionConnectionConfig,
  fetchRequest: FetchRequest = globalThis.fetch,
) {
  const railwayClient = createRailwayClient({ apiUrl: config.railwayApiUrl, fetch: fetchRequest })

  try {
    await railwayClient.request({ document: apiTokenWorkspacesQuery, token, variables: {} })
  } catch (error) {
    if (checkRailwayUnauthorized(error)) {
      throw new SessionConnectionError(rejectedRailwayTokenMessage)
    }

    if (error instanceof RailwayGraphQLError || error instanceof RailwayRateLimitError) {
      throw new SessionConnectionError(error.message)
    }

    throw new SessionConnectionError('Railway could not verify this token.')
  }

  await writeSession(token, config.sessionSecret)
}
