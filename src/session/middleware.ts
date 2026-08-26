import { createMiddleware } from '@tanstack/react-start'
import { loadConfigMiddleware } from '@/server-functions/middleware'
import { readWithRailwaySession } from '@/session/read-with-railway-session.server'

export const requireRailwaySessionMiddleware = createMiddleware({ type: 'function' })
  .middleware([loadConfigMiddleware])
  .server(({ context, next }) =>
    readWithRailwaySession(context.config.sessionSecret, (railwayToken) =>
      next({ context: { railwayToken } }),
    ),
  )
