import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import {
  clearPrivateDataAndSetSessionState,
  sessionStateQueryKey,
} from '@/session/hooks/use-session-state'
import type { RailwaySessionResult, SessionState } from '@/session/schema'

type RouterInvalidator = Pick<ReturnType<typeof useRouter>, 'invalidate'>

export async function endRailwaySession(queryClient: QueryClient, router: RouterInvalidator) {
  const sessionState = queryClient.getQueryData<SessionState>(sessionStateQueryKey)

  if (sessionState === 'ended') {
    return
  }

  clearPrivateDataAndSetSessionState(queryClient, 'ended')
  await router.invalidate({ sync: true })
}

export function useReadSelectionResult() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return async function readSelectionResult<Option>(
    resultPromise: Promise<RailwaySessionResult<readonly Option[]>>,
  ) {
    const result = await resultPromise

    if (result.kind === 'success') {
      return result.value
    }

    await endRailwaySession(queryClient, router)
    return []
  }
}
