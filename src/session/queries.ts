import { queryOptions } from '@tanstack/react-query'
import { readSessionState } from '@/session/read-session-state'

export const sessionQueryOptions = queryOptions({
  queryFn: ({ signal }) => readSessionState({ signal }),
  queryKey: ['session'] as const,
})
