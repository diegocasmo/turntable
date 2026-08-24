import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { loadConfig } from '@/config.server'
import { projectsQuery, projectsQuerySchema } from '@/gql/operations/projects'
import { createRailwayClient } from '@/railway/client.server'
import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
import {
  clearSessionCookie,
  InvalidSessionError,
  railwayTokenSchema,
  readSession,
  writeSession,
} from '@/session.server'

const responseHeaders = { 'cache-control': 'no-store' }
const sessionRequestSchema = z.object({
  token: railwayTokenSchema,
})

type Fetch = (request: Request) => Promise<Response>

type SessionRouteOptions = Readonly<{
  appOrigin: string
  fetch?: Fetch
  railwayApiUrl: string
  sessionSecret: string
}>

function createErrorResponse(error: string, status: number, headers?: HeadersInit) {
  return Response.json(
    { error },
    {
      headers: { ...responseHeaders, ...headers },
      status,
    },
  )
}

function hasExpectedOrigin(request: Request, expectedOrigin: string) {
  const origin = request.headers.get('origin')

  if (origin === null) {
    return false
  }

  try {
    return new URL(origin).origin === origin && origin === expectedOrigin
  } catch {
    return false
  }
}

function redactToken(message: string, token: string) {
  return message.replaceAll(token, '[REDACTED]')
}

function createRailwayErrorResponse(error: unknown, token: string) {
  if (error instanceof RailwayGraphQLError) {
    return createErrorResponse(redactToken(error.message, token), error.isUnauthorized ? 401 : 502)
  }

  if (error instanceof RailwayRateLimitError) {
    const headers =
      error.retryAfterSeconds === undefined
        ? undefined
        : { 'retry-after': String(error.retryAfterSeconds) }
    return createErrorResponse(error.message, 429, headers)
  }

  return createErrorResponse('Railway could not verify this token.', 502)
}

export function createSessionRouteHandlers({
  appOrigin,
  fetch = globalThis.fetch,
  railwayApiUrl,
  sessionSecret,
}: SessionRouteOptions) {
  const railwayClient = createRailwayClient({ apiUrl: railwayApiUrl, fetch })

  return {
    async DELETE(request: Request) {
      if (!hasExpectedOrigin(request, appOrigin)) {
        return createErrorResponse('The request origin is not allowed.', 403)
      }

      try {
        await readSession(sessionSecret)
      } catch (error) {
        if (error instanceof InvalidSessionError) {
          return createErrorResponse(error.message, 401)
        }

        throw error
      }

      await clearSessionCookie(sessionSecret)
      return new Response(null, {
        headers: responseHeaders,
        status: 204,
      })
    },

    async POST(request: Request) {
      if (!hasExpectedOrigin(request, appOrigin)) {
        return createErrorResponse('The request origin is not allowed.', 403)
      }

      const parsedBody = sessionRequestSchema.safeParse(await request.json().catch(() => undefined))

      if (!parsedBody.success) {
        return createErrorResponse('The request body must contain a valid Railway token.', 400)
      }

      try {
        await railwayClient.request({
          dataSchema: projectsQuerySchema,
          query: projectsQuery,
          token: parsedBody.data.token,
        })
      } catch (error) {
        return createRailwayErrorResponse(error, parsedBody.data.token)
      }

      await writeSession(parsedBody.data.token, sessionSecret)
      return new Response(null, {
        headers: responseHeaders,
        status: 204,
      })
    },
  }
}

function createConfiguredHandlers() {
  const config = loadConfig()
  return createSessionRouteHandlers(config)
}

export const Route = createFileRoute('/api/session')({
  server: {
    handlers: {
      DELETE: ({ request }) => createConfiguredHandlers().DELETE(request),
      POST: ({ request }) => createConfiguredHandlers().POST(request),
    },
  },
})
