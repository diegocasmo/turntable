import { createServerFn } from '@tanstack/react-start'
import { deploymentTargetSchema } from '@/deployment/schema'
import { spinUpRailwayDeployment } from '@/deployment/spin-up-deployment.server'
import { requireAppOriginMiddleware } from '@/server-functions/middleware'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const spinUpDeployment = createServerFn({ method: 'POST' })
  .middleware([requireAppOriginMiddleware, requireRailwaySessionMiddleware])
  .validator(deploymentTargetSchema)
  .handler(({ context, data }) =>
    spinUpRailwayDeployment(context.railwayToken, context.config.railwayApiUrl, data),
  )
