import { createServerFn } from '@tanstack/react-start'
import { readRailwayEnvironments } from '@/selection/read-environments.server'
import { readWithRailwaySession } from '@/selection/read-with-railway-session.server'
import { readEnvironmentsInputSchema } from '@/selection/schema'
import { loadConfigMiddleware } from '@/server-functions/middleware'

export const readEnvironments = createServerFn({ method: 'GET' })
  .middleware([loadConfigMiddleware])
  .validator(readEnvironmentsInputSchema)
  .handler(({ context, data }) =>
    readWithRailwaySession(context.config.sessionSecret, (token) =>
      readRailwayEnvironments(token, context.config.railwayApiUrl, data.projectId),
    ),
  )
