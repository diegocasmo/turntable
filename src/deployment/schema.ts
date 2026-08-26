import { z } from '@/zod'

const railwayIdSchema = z.string().min(1)

export const deploymentTargetSchema = z.object({
  environmentId: railwayIdSchema,
  projectId: railwayIdSchema,
  serviceId: railwayIdSchema,
})

export type DeploymentTarget = z.infer<typeof deploymentTargetSchema>

export const deploymentStreamInputSchema = deploymentTargetSchema.extend({
  deploymentId: railwayIdSchema.optional(),
})

export type DeploymentStreamInput = z.infer<typeof deploymentStreamInputSchema>
