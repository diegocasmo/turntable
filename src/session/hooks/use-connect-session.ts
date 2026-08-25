import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useRef } from 'react'
import { connectToRailway } from '@/session/connect-to-railway'
import { clearPrivateDataAndSetSessionState } from '@/session/hooks/use-session-state'

export function useConnectSession() {
  const router = useRouter()
  const queryClient = useQueryClient()
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
    onSuccess: (sessionState) => {
      clearPrivateDataAndSetSessionState(queryClient, sessionState)
      return router.invalidate({ sync: true })
    },
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
