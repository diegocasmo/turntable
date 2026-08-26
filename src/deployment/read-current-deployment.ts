import { createServerFn } from '@tanstack/react-start'
import { readRailwayCurrentDeployment } from '@/deployment/read-current-deployment.server'
import { deploymentTargetSchema } from '@/deployment/schema'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const readCurrentDeployment = createServerFn({ method: 'GET' })
  .middleware([requireRailwaySessionMiddleware])
  .validator(deploymentTargetSchema)
  .handler(({ context, data }) =>
    readRailwayCurrentDeployment(context.railwayToken, context.config.railwayApiUrl, data),
  )
