import { queryOptions } from '@tanstack/react-query'
import { readSessionState } from '@/session/read-session-state'

export const sessionQueryKey = ['session'] as const

export function createSessionQueryOptions() {
  return queryOptions({
    queryFn: ({ signal }) => readSessionState({ signal }),
    queryKey: sessionQueryKey,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}
