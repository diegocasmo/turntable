import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { disconnectFromRailway } from '@/session.functions'

export function useDisconnectSession() {
  const router = useRouter()
  const disconnect = useServerFn(disconnectFromRailway)

  return useMutation({
    mutationFn: disconnect,
    onSuccess: () => router.invalidate({ sync: true }),
  })
}
