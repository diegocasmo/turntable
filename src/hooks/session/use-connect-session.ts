import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { connectToRailway } from '@/session.functions'

export function useConnectSession() {
  const router = useRouter()
  const connect = useServerFn(connectToRailway)

  return useMutation({
    gcTime: 0,
    mutationFn: connect,
    onSuccess: () => router.invalidate({ sync: true }),
  })
}
