import { createServerFn } from '@tanstack/react-start'
import { requireRailwaySessionMiddleware } from '@/selection/middleware'
import { readRailwayEnvironments } from '@/selection/read-environments.server'
import { readEnvironmentsInputSchema } from '@/selection/schema'

export const readEnvironments = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .validator(readEnvironmentsInputSchema)
  .handler(({ context, data }) =>
    readRailwayEnvironments(context.railwayToken, context.config.railwayApiUrl, data.projectId),
  )
