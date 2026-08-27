import { createFileRoute, redirect } from '@tanstack/react-router'
import { entitySearchSchema } from '@/selection/schema'

export const Route = createFileRoute('/')({
  validateSearch: entitySearchSchema,
  beforeLoad: ({ search: { q } }) => {
    throw redirect({ to: '/projects', search: q ? { q } : {}, replace: true })
  },
})
