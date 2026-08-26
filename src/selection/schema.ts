import { z } from '@/zod'

const railwayIdSchema = z.string().min(1)
const optionalRailwayIdSchema = railwayIdSchema.optional().catch(undefined)
export const selectionSearchSchema = z.object({
  environmentId: optionalRailwayIdSchema,
  projectId: optionalRailwayIdSchema,
  serviceId: optionalRailwayIdSchema,
})

export type SelectionSearch = z.infer<typeof selectionSearchSchema>
