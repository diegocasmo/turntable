import { createServerFn } from '@tanstack/react-start'
import { readRailwayProjects } from '@/selection/read-projects.server'
import { readWithRailwaySession } from '@/selection/read-with-railway-session.server'
import { loadConfigMiddleware } from '@/server-functions/middleware'

export const readProjects = createServerFn({ method: 'GET' })
  .middleware([loadConfigMiddleware])
  .handler(({ context }) =>
    readWithRailwaySession(context.config.sessionSecret, (token) =>
      readRailwayProjects(token, context.config.railwayApiUrl),
    ),
  )
