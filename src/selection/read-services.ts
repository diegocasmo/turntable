import { createServerFn } from '@tanstack/react-start'
import { requireRailwaySessionMiddleware } from '@/selection/middleware'
import { readRailwayServices } from '@/selection/read-services.server'
import { readServicesInputSchema } from '@/selection/schema'

export const readServices = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .validator(readServicesInputSchema)
  .handler(({ context, data }) =>
    readRailwayServices(
      context.railwayToken,
      context.config.railwayApiUrl,
      data.projectId,
      data.environmentId,
    ),
  )
