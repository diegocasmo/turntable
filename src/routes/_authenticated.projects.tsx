import { createFileRoute } from '@tanstack/react-router'
import { SelectionPickers } from '@/selection/components/selection-pickers'
import { selectionSearchSchema } from '@/selection/schema'

export const Route = createFileRoute('/_authenticated/projects')({
  validateSearch: selectionSearchSchema,
  component: SelectionPickers,
})
