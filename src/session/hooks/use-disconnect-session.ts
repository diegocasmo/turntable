import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { disconnectFromRailway } from '@/session/disconnect-from-railway'

export function useDisconnectSession() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: disconnectFromRailway,
    onSuccess: () => {
      queryClient.clear()
      return router.invalidate({ sync: true })
    },
  })
}
