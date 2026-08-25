import { createMiddleware } from '@tanstack/react-start'
import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
import { redactRailwayToken } from '@/railway/redact-token.server'
import { loadConfigMiddleware } from '@/server-functions/middleware'
import { InvalidSessionError, readSession } from '@/session/cookie.server'

function createSelectionReadError(error: unknown, token?: string) {
  if (error instanceof InvalidSessionError) {
    return new Error('Your session expired. Enter your workspace token again.')
  }

  if (error instanceof RailwayGraphQLError && token !== undefined) {
    return new Error(redactRailwayToken(error.message, token))
  }

  if (error instanceof RailwayRateLimitError) {
    return new Error(error.message)
  }

  return new Error('Turntable could not load Railway choices. Try again.')
}

export const requireRailwaySessionMiddleware = createMiddleware({ type: 'function' })
  .middleware([loadConfigMiddleware])
  .server(async ({ context, next }) => {
    let token: string | undefined

    try {
      const session = await readSession(context.config.sessionSecret)
      token = session.token
      return await next({ context: { railwayToken: token } })
    } catch (error) {
      throw createSelectionReadError(error, token)
    }
  })
