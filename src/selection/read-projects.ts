import { createServerFn } from '@tanstack/react-start'
import { requireRailwaySessionMiddleware } from '@/selection/middleware'
import { readRailwayProjects } from '@/selection/read-projects.server'

export const readProjects = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .handler(({ context }) => readRailwayProjects(context.railwayToken, context.config.railwayApiUrl))
