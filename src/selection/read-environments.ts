import { createServerFn } from '@tanstack/react-start'
import { readRailwayEnvironments } from '@/selection/read-environments.server'
import { readEnvironmentsInputSchema } from '@/selection/schema'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const readEnvironments = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .validator(readEnvironmentsInputSchema)
  .handler(({ context, data }) =>
    readRailwayEnvironments(context.railwayToken, context.config.railwayApiUrl, data.projectId),
  )
