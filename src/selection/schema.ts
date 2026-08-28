import { z } from '@/zod'

const railwayIdSchema = z.string().min(1)
export const entitySearchSchema = z.object({
  notice: z.literal('unavailable').optional().catch(undefined),
  q: z.string().optional().catch(undefined),
})
export const readProjectInputSchema = z.object({ projectId: railwayIdSchema })
export const readEnvironmentInputSchema = z.object({
  environmentId: railwayIdSchema,
  projectId: railwayIdSchema,
})
export const readEnvironmentsInputSchema = z.object({ projectId: railwayIdSchema })
export const readServicesInputSchema = z.object({
  environmentId: railwayIdSchema,
  projectId: railwayIdSchema,
})
