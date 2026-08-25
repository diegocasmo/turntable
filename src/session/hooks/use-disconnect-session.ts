import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { disconnectFromRailway } from '@/session/disconnect-from-railway'
import { clearPrivateDataAndSetSessionState } from '@/session/hooks/use-session-state'

export function useDisconnectSession() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const disconnect = useServerFn(disconnectFromRailway)

  return useMutation({
    mutationFn: disconnect,
    onSuccess: (sessionState) => {
      clearPrivateDataAndSetSessionState(queryClient, sessionState)
      return router.invalidate({ sync: true })
    },
  })
}
