import { projectsQuery } from '@/gql/operations/projects'
import { createRailwayClient } from '@/railway/client.server'
import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
import { redactRailwayToken } from '@/railway/redact-token.server'
import { writeSession } from '@/session/cookie.server'

export class SessionConnectionError extends Error {
  override readonly name = 'SessionConnectionError'
}

type FetchRequest = (request: Request) => Promise<Response>

type SessionConnectionConfig = Readonly<{
  railwayApiUrl: string
  sessionSecret: string
}>

function createTokenVerificationError(error: unknown, token: string) {
  if (error instanceof RailwayGraphQLError) {
    return new SessionConnectionError(redactRailwayToken(error.message, token))
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
    await railwayClient.request({ document: projectsQuery, token, variables: { first: 1 } })
  } catch (error) {
    throw createTokenVerificationError(error, token)
  }

  await writeSession(token, config.sessionSecret)
}
