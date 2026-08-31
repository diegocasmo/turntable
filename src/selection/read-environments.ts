import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { readRailwayEnvironments } from '@/selection/read-environments.server'
import { projectInputSchema } from '@/selection/schema'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const readEnvironments = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .validator(projectInputSchema)
  .handler(({ context, data }) =>
    readRailwayEnvironments(
      context.railwayToken,
      context.config.railwayApiUrl,
      data.projectId,
      globalThis.fetch,
      getRequest().signal,
    ),
  )
