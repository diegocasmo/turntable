import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { readRailwayServices } from '@/selection/read-services.server'
import { readServicesInputSchema } from '@/selection/schema'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const readServices = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .validator(readServicesInputSchema)
  .handler(({ context, data }) =>
    readRailwayServices(
      context.railwayToken,
      context.config.railwayApiUrl,
      data.projectId,
      data.environmentId,
      globalThis.fetch,
      getRequest().signal,
    ),
  )
