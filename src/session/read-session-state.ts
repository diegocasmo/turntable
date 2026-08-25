import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { loadConfigMiddleware } from '@/server-functions/middleware'
import { sessionCookieName } from '@/session/cookie.server'
import { readSessionState as readStoredSessionState } from '@/session/read-state.server'

export const readSessionState = createServerFn({ method: 'GET' })
  .middleware([loadConfigMiddleware])
  .handler(({ context }) =>
    readStoredSessionState(
      context.config.sessionSecret,
      getCookie(sessionCookieName) !== undefined,
    ),
  )
