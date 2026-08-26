import { createServerFn } from '@tanstack/react-start'
import { spinDownRailwayDeployment } from '@/deployment/spin-down-deployment.server'
import { requireAppOriginMiddleware } from '@/server-functions/middleware'
import { requireRailwaySessionMiddleware } from '@/session/middleware'
import { z } from '@/zod'

export const spinDownDeploymentInputSchema = z.object({
  deploymentId: z.string().min(1),
})

export type SpinDownDeploymentInput = z.infer<typeof spinDownDeploymentInputSchema>

export const spinDownDeployment = createServerFn({ method: 'POST' })
  .middleware([requireAppOriginMiddleware, requireRailwaySessionMiddleware])
  .validator(spinDownDeploymentInputSchema)
  .handler(({ context, data }) =>
    spinDownRailwayDeployment(
      context.railwayToken,
      context.config.railwayApiUrl,
      data.deploymentId,
    ),
  )
