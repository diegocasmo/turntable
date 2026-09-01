import { z } from '@/zod'

const railwayIdSchema = z.string().min(1)
export const entitySearchSchema = z.object({
  notice: z.literal('unavailable').optional().catch(undefined),
  q: z.string().optional().catch(undefined),
})
export const projectInputSchema = z.object({ projectId: railwayIdSchema })
export const environmentInputSchema = z.object({ environmentId: railwayIdSchema })
export const projectEnvironmentInputSchema = z.object({
  environmentId: railwayIdSchema,
  projectId: railwayIdSchema,
})
