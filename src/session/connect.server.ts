import { apiTokenWorkspacesQuery } from '@/gql/operations/api-token-workspaces'
import { createRailwayClient } from '@/railway/client.server'
import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
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

function createTokenVerificationError(error: unknown) {
  if (error instanceof RailwayGraphQLError) {
    return new SessionConnectionError(
      error.isUnauthorized ? rejectedRailwayTokenMessage : error.message,
    )
  }

  if (error instanceof RailwayRateLimitError) {
    return new SessionConnectionError(error.message)
  }

  return new SessionConnectionError('Railway could not verify this token.')
}

export async function connectRailwaySession(
  token: string,
  config: SessionConnectionConfig,
  fetchRequest: FetchRequest = globalThis.fetch,
) {
  const railwayClient = createRailwayClient({ apiUrl: config.railwayApiUrl, fetch: fetchRequest })

  try {
    await railwayClient.request({ document: apiTokenWorkspacesQuery, token, variables: {} })
  } catch (error) {
    throw createTokenVerificationError(error)
  }

  await writeSession(token, config.sessionSecret)
}
