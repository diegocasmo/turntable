import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { loadConfigMiddleware, requireAppOriginMiddleware } from '@/server-functions/middleware'
import { connectRailwaySession, SessionConnectionError } from '@/session/connect.server'
import { sessionCookieName } from '@/session/cookie.server'
import { disconnectRailwaySession } from '@/session/disconnect.server'
import { readSessionState as readStoredSessionState } from '@/session/read-state.server'
import { type SessionState, sessionInputSchema } from '@/session/schema'

const authenticatedSessionState: SessionState = 'authenticated'

function createConnectError(error: unknown) {
  return error instanceof SessionConnectionError
    ? error
    : new Error('Turntable could not connect to Railway. Try again.')
}

function createDisconnectError() {
  return new Error('Turntable could not sign out this browser. Try again.')
}

export const readSessionState = createServerFn({ method: 'GET' })
  .middleware([loadConfigMiddleware])
  .handler(({ context }) =>
    readStoredSessionState(
      context.config.sessionSecret,
      getCookie(sessionCookieName) !== undefined,
    ),
  )

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

export const disconnectFromRailway = createServerFn({ method: 'POST' })
  .middleware([requireAppOriginMiddleware])
  .handler(async ({ context }) => {
    try {
      return await disconnectRailwaySession(context.config.sessionSecret)
    } catch {
      throw createDisconnectError()
    }
  })
