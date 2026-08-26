import { z } from '@/zod'

const railwayIdSchema = z.string().min(1)

export const deploymentTargetSchema = z.object({
  environmentId: railwayIdSchema,
  projectId: railwayIdSchema,
  serviceId: railwayIdSchema,
})

export type DeploymentTarget = z.infer<typeof deploymentTargetSchema>
