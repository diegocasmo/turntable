import { createFileRoute, redirect } from '@tanstack/react-router'
import { selectionSearchSchema } from '@/selection/schema'

export const Route = createFileRoute('/')({
  validateSearch: selectionSearchSchema,
  beforeLoad: ({ search: { q } }) => {
    throw redirect({ to: '/projects', search: q ? { q } : {}, replace: true })
  },
})
