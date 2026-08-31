import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { readRailwayEnvironment } from '@/selection/read-environment.server'
import { environmentInputSchema } from '@/selection/schema'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const readEnvironment = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .validator(environmentInputSchema)
  .handler(({ context, data }) =>
    readRailwayEnvironment(
      context.railwayToken,
      context.config.railwayApiUrl,
      data.projectId,
      data.environmentId,
      globalThis.fetch,
      getRequest().signal,
    ),
  )
