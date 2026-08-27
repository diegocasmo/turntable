import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { readRailwayProjects } from '@/selection/read-projects.server'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const readProjects = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .handler(({ context }) =>
    readRailwayProjects(
      context.railwayToken,
      context.config.railwayApiUrl,
      globalThis.fetch,
      getRequest().signal,
    ),
  )
