import { createMiddleware, createServerFn } from '@tanstack/react-start'
import {
  getCookie,
  getRequest,
  setResponseHeader,
  setResponseStatus,
} from '@tanstack/react-start/server'
import { loadConfig } from '@/config.server'
import {
  connectRailwaySession,
  disconnectRailwaySession,
  readSessionState as readStoredSessionState,
  requireAppOrigin,
  SessionActionError,
  sessionCookieName,
} from '@/session.server'
import { type SessionState, sessionInputSchema } from '@/session-schema'

const authenticatedSessionState: SessionState = 'authenticated'
const loadSessionConfigMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    setResponseHeader('cache-control', 'no-store')
    return next({ context: { sessionConfig: loadConfig() } })
  },
)
const requireAppOriginMiddleware = createMiddleware({ type: 'function' })
  .middleware([loadSessionConfigMiddleware])
  .server(async ({ context, next }) => {
    try {
      requireAppOrigin(getRequest(), context.sessionConfig.appOrigin)
    } catch (error) {
      setResponseStatus(403)
      throw error
    }

    return next()
  })

function createConnectError(error: unknown) {
  return error instanceof SessionActionError
    ? error
    : new Error('Turntable could not connect to Railway. Try again.')
}

function createDisconnectError(error: unknown) {
  return error instanceof SessionActionError
    ? error
    : new Error('Turntable could not sign out this browser. Try again.')
}

export const readSessionState = createServerFn({ method: 'GET' })
  .middleware([loadSessionConfigMiddleware])
  .handler(({ context }) =>
    readStoredSessionState(
      context.sessionConfig.sessionSecret,
      getCookie(sessionCookieName) !== undefined,
    ),
  )

export const connectToRailway = createServerFn({ method: 'POST' })
  .middleware([requireAppOriginMiddleware])
  .validator(sessionInputSchema)
  .handler(async ({ context, data }) => {
    try {
      await connectRailwaySession(data.token, context.sessionConfig)
      return authenticatedSessionState
    } catch (error) {
      throw createConnectError(error)
    }
  })

export const disconnectFromRailway = createServerFn({ method: 'POST' })
  .middleware([requireAppOriginMiddleware])
  .handler(async ({ context }) => {
    try {
      return await disconnectRailwaySession(context.sessionConfig.sessionSecret)
    } catch (error) {
      throw createDisconnectError(error)
    }
  })
