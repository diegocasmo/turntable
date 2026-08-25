import { createMiddleware } from '@tanstack/react-start'
import { readWithRailwaySession } from '@/selection/read-with-railway-session.server'
import { loadConfigMiddleware } from '@/server-functions/middleware'

export const requireRailwaySessionMiddleware = createMiddleware({ type: 'function' })
  .middleware([loadConfigMiddleware])
  .server(({ context, next }) =>
    readWithRailwaySession(context.config.sessionSecret, (railwayToken) =>
      next({ context: { railwayToken } }),
    ),
  )
