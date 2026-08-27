import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { readRailwayServiceActionState } from '@/deployment/read-service-action-state.server'
import { deploymentTargetSchema } from '@/deployment/schema'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const readServiceActionState = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .validator(deploymentTargetSchema)
  .handler(({ context, data }) =>
    readRailwayServiceActionState(
      context.railwayToken,
      context.config.railwayApiUrl,
      data,
      globalThis.fetch,
      getRequest().signal,
    ),
  )
