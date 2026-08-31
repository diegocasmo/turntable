import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { readRailwayProject } from '@/selection/read-project.server'
import { projectInputSchema } from '@/selection/schema'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const readProject = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .validator(projectInputSchema)
  .handler(({ context, data }) =>
    readRailwayProject(
      context.railwayToken,
      context.config.railwayApiUrl,
      data.projectId,
      globalThis.fetch,
      getRequest().signal,
    ),
  )
