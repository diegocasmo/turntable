import { createServerFn } from '@tanstack/react-start'
import { readRailwayServices } from '@/selection/read-services.server'
import { readWithRailwaySession } from '@/selection/read-with-railway-session.server'
import { readServicesInputSchema } from '@/selection/schema'
import { loadConfigMiddleware } from '@/server-functions/middleware'

export const readServices = createServerFn({ method: 'GET' })
  .middleware([loadConfigMiddleware])
  .validator(readServicesInputSchema)
  .handler(({ context, data }) =>
    readWithRailwaySession(context.config.sessionSecret, (token) =>
      readRailwayServices(token, context.config.railwayApiUrl, data.projectId, data.environmentId),
    ),
  )
