import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useRef } from 'react'
import { connectToRailway } from '@/session/functions'

export function useConnectSession() {
  const router = useRouter()
  const connect = useServerFn(connectToRailway)
  const token = useRef('')

  const mutation = useMutation({
    gcTime: 0,
    mutationFn: () => connect({ data: { token: token.current } }),
    onSuccess: () => router.invalidate({ sync: true }),
  })

  async function connectSession(railwayToken: string) {
    token.current = railwayToken

    try {
      return await mutation.mutateAsync()
    } finally {
      token.current = ''
    }
  }

  return {
    connect: connectSession,
    error: mutation.error,
    isPending: mutation.isPending,
    reset: mutation.reset,
  }
}
