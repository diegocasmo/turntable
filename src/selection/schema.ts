import { z } from '@/zod'

const railwayIdSchema = z.string().min(1)
export const entitySearchSchema = z.object({ q: z.string().optional().catch(undefined) })
const selectionNoticeSchema = z.object({ selectionNotice: z.string().optional() })
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
export function readSelectionNotice(value: unknown) {
  return selectionNoticeSchema.safeParse(value).data?.selectionNotice
}
