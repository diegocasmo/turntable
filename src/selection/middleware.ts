import { createMiddleware } from '@tanstack/react-start'
import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
import { loadConfigMiddleware } from '@/server-functions/middleware'
import { InvalidSessionError, readSession } from '@/session/cookie.server'

function createSelectionReadError(error: unknown) {
  if (error instanceof InvalidSessionError) {
    return new Error('Your session expired. Enter your workspace token again.')
  }

  if (error instanceof RailwayGraphQLError) {
    return new Error(error.message)
  }

  if (error instanceof RailwayRateLimitError) {
    return new Error(error.message)
  }

  return new Error('Turntable could not load Railway choices. Try again.')
}

export const requireRailwaySessionMiddleware = createMiddleware({ type: 'function' })
  .middleware([loadConfigMiddleware])
  .server(async ({ context, next }) => {
    try {
      const session = await readSession(context.config.sessionSecret)
      return await next({ context: { railwayToken: session.token } })
    } catch (error) {
      throw createSelectionReadError(error)
    }
  })
