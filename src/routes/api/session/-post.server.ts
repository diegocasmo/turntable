import { z } from 'zod'
import { projectsQuery } from '@/gql/operations/projects'
import { createRailwayClient } from '@/railway/client.server'
import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
import {
  createSessionErrorResponse,
  type SessionRouteConfig,
} from '@/routes/api/session/-request.server'
import { railwayTokenSchema, writeSession } from '@/session.server'

const sessionRequestSchema = z.object({
  token: railwayTokenSchema,
})

type FetchRequest = (request: Request) => Promise<Response>

function redactToken(message: string, token: string) {
  return message.replaceAll(token, '[REDACTED]')
}

function createTokenVerificationErrorResponse(error: unknown, token: string) {
  if (error instanceof RailwayGraphQLError) {
    return createSessionErrorResponse(
      redactToken(error.message, token),
      error.isUnauthorized ? 401 : 502,
    )
  }

  if (error instanceof RailwayRateLimitError) {
    const headers =
      error.retryAfterSeconds === undefined
        ? undefined
        : { 'retry-after': String(error.retryAfterSeconds) }
    return createSessionErrorResponse(error.message, 429, headers)
  }

  return createSessionErrorResponse('Railway could not verify this token.', 502)
}

export async function handleSessionPost(
  request: Request,
  config: SessionRouteConfig,
  fetchRequest: FetchRequest = globalThis.fetch,
) {
  const parsedBody = sessionRequestSchema.safeParse(await request.json().catch(() => undefined))

  if (!parsedBody.success) {
    return createSessionErrorResponse('The request body must contain a valid Railway token.', 400)
  }

  const railwayClient = createRailwayClient({ apiUrl: config.railwayApiUrl, fetch: fetchRequest })

  try {
    await railwayClient.request({
      document: projectsQuery,
      token: parsedBody.data.token,
      variables: {},
    })
  } catch (error) {
    return createTokenVerificationErrorResponse(error, parsedBody.data.token)
  }

  await writeSession(parsedBody.data.token, config.sessionSecret)
  return new Response(null, { status: 204 })
}
