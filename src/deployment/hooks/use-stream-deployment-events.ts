import {
  skipToken,
  experimental_streamedQuery as streamedQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import type { DeploymentStreamEvent } from '@/deployment/event-stream'
import type { DeploymentTarget } from '@/deployment/schema'
import { streamDeploymentEvents } from '@/deployment/stream-deployment-events'
import { useDisconnectSession } from '@/session/hooks/use-disconnect-session'

type DeploymentWatchState = Readonly<{
  deploymentId?: string | undefined
  event?: DeploymentStreamEvent | undefined
  transition?: 'reconnect' | 'refresh' | 'spin-up' | undefined
}>

const reduceDeploymentEvents = (
  current: DeploymentWatchState | undefined,
  event: DeploymentStreamEvent,
): DeploymentWatchState | undefined => (event.type === 'heartbeat' ? current : { event })

export function useStreamDeploymentEvents(target: DeploymentTarget | undefined) {
  const disconnect = useDisconnectSession()
  const stream = useServerFn(streamDeploymentEvents)
  const queryClient = useQueryClient()
  const queryKey = ['deployment', target] as const

  const query = useQuery({
    queryFn:
      target === undefined
        ? skipToken
        : streamedQuery({
            initialValue: undefined,
            reducer: reduceDeploymentEvents,
            refetchMode: 'append',
            streamFn: async function* ({ client, signal }) {
              const state = client.getQueryData<DeploymentWatchState>(queryKey)
              const events = await stream({
                data: { ...target, deploymentId: state?.deploymentId },
                signal,
              })

              for await (const event of events) {
                if (event.type === 'session-expired') {
                  await disconnect.mutateAsync({})
                  return
                }

                yield event
              }
            },
          }),
    queryKey,
    staleTime: Infinity,
  })

  const startTransition = (
    transition: NonNullable<DeploymentWatchState['transition']>,
    deploymentId?: string,
  ) => {
    queryClient.setQueryData(queryKey, { deploymentId, event: query.data?.event, transition })
    void query.refetch()
  }

  return {
    ...query,
    data: query.data?.event,
    transition: query.isFetching ? query.data?.transition : undefined,
    refresh: () => startTransition(query.error ? 'reconnect' : 'refresh'),
    watchDeployment: (deploymentId: string) => startTransition('spin-up', deploymentId),
  }
}
