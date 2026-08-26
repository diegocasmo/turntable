import { createServerFn } from '@tanstack/react-start'
import { readRailwaySelectionHierarchy } from '@/selection/read-selection-hierarchy.server'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const readSelectionHierarchy = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .handler(({ context }) =>
    readRailwaySelectionHierarchy(context.railwayToken, context.config.railwayApiUrl),
  )
