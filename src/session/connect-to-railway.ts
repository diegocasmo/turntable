import { createServerFn } from '@tanstack/react-start'
import { requireAppOriginMiddleware } from '@/server-functions/middleware'
import { connectRailwaySession, SessionConnectionError } from '@/session/connect.server'
import { type SessionState, sessionInputSchema } from '@/session/schema'

const authenticatedSessionState: SessionState = 'authenticated'

function createConnectError(error: unknown) {
  return error instanceof SessionConnectionError
    ? error
    : new Error('Turntable could not connect to Railway. Try again.')
}

export const connectToRailway = createServerFn({ method: 'POST' })
  .middleware([requireAppOriginMiddleware])
  .validator(sessionInputSchema)
  .handler(async ({ context, data }) => {
    try {
      await connectRailwaySession(data.token, context.config)
      return authenticatedSessionState
    } catch (error) {
      throw createConnectError(error)
    }
  })
