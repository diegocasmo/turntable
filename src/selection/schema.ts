import { z } from '@/zod'

const railwayIdSchema = z.string().min(1)
const optionalRailwayIdSchema = railwayIdSchema.optional().catch(undefined)
export const selectionSearchSchema = z.object({
  environmentId: optionalRailwayIdSchema,
  projectId: optionalRailwayIdSchema,
  serviceId: optionalRailwayIdSchema,
})

export const readEnvironmentsInputSchema = z.object({ projectId: railwayIdSchema })
export const readServicesInputSchema = z.object({
  environmentId: railwayIdSchema,
  projectId: railwayIdSchema,
})

export type SelectionSearch = z.infer<typeof selectionSearchSchema>
