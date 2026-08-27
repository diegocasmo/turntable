import { createFileRoute, redirect } from '@tanstack/react-router'
import { selectionSearchSchema } from '@/selection/schema'

export const Route = createFileRoute('/')({
  validateSearch: selectionSearchSchema,
  beforeLoad: () => {
    throw redirect({ to: '/projects', replace: true })
  },
})
