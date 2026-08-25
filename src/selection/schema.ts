import { z } from 'zod'

const railwayIdSchema = z.string().min(1)

export const readEnvironmentsInputSchema = z.object({ projectId: railwayIdSchema })
export const readServicesInputSchema = z.object({
  environmentId: railwayIdSchema,
  projectId: railwayIdSchema,
})
