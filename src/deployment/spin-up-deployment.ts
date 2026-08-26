import { createServerFn } from '@tanstack/react-start'
import { type DeploymentTarget, deploymentTargetSchema } from '@/deployment/schema'
import { spinUpRailwayDeployment } from '@/deployment/spin-up-deployment.server'
import { requireAppOriginMiddleware } from '@/server-functions/middleware'
import { requireRailwaySessionMiddleware } from '@/session/middleware'

export const spinUpDeploymentInputSchema = deploymentTargetSchema

export type SpinUpDeploymentInput = DeploymentTarget

export const spinUpDeployment = createServerFn({ method: 'POST' })
  .middleware([requireAppOriginMiddleware, requireRailwaySessionMiddleware])
  .validator(spinUpDeploymentInputSchema)
  .handler(({ context, data }) =>
    spinUpRailwayDeployment(context.railwayToken, context.config.railwayApiUrl, data),
  )
