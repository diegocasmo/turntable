import { type QueryClient, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { readSessionState } from '@/session/read-session-state'
import type { SessionState } from '@/session/schema'

export const sessionStateQueryKey = ['session-state'] as const

export function clearPrivateDataAndSetSessionState(
  queryClient: QueryClient,
  sessionState: SessionState,
) {
  queryClient.removeQueries({
    predicate: ({ queryKey }) => queryKey.length !== 1 || queryKey[0] !== sessionStateQueryKey[0],
  })
  queryClient.getMutationCache().clear()
  queryClient.setQueryData(sessionStateQueryKey, sessionState)
}

export function useSessionState(initialState: SessionState) {
  const read = useServerFn(readSessionState)

  return useQuery({
    initialData: initialState,
    queryFn: () => read({}),
    queryKey: sessionStateQueryKey,
    staleTime: Number.POSITIVE_INFINITY,
  })
}
