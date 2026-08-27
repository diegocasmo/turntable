import { createFileRoute, redirect } from '@tanstack/react-router'
import { selectionSearchSchema } from '@/selection/schema'

export const Route = createFileRoute('/')({
  validateSearch: selectionSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ replace: true, search, to: '/projects' })
  },
})
