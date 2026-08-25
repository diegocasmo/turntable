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
    mutationFn: async () => {
      try {
        return await connect({ data: { token: token.current } })
      } finally {
        token.current = ''
      }
    },
    onSuccess: () => router.invalidate({ sync: true }),
  })

  function connectSession(railwayToken: string) {
    if (token.current !== '') {
      return
    }

    token.current = railwayToken
    mutation.mutate()
  }

  return {
    connect: connectSession,
    error: mutation.error,
    isPending: mutation.isPending,
    reset: mutation.reset,
  }
}
