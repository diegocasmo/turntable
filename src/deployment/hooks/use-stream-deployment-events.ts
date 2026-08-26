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
  transition?: 'refresh' | 'spin-up' | undefined
}>

function reduceDeploymentEvents(
  current: DeploymentWatchState | undefined,
  event: DeploymentStreamEvent,
): DeploymentWatchState | undefined {
  return event.type === 'heartbeat' ? current : { event }
}

function createDeploymentQueryKey(target: DeploymentTarget | undefined) {
  return ['deployment', target?.projectId, target?.environmentId, target?.serviceId] as const
}

export function useStreamDeploymentEvents(target: DeploymentTarget | undefined) {
  const disconnect = useDisconnectSession()
  const stream = useServerFn(streamDeploymentEvents)
  const queryClient = useQueryClient()
  const queryKey = createDeploymentQueryKey(target)

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
    queryClient.setQueryData<DeploymentWatchState>(queryKey, (current) => ({
      deploymentId,
      event: current?.event,
      transition,
    }))
    void query.refetch()
  }

  return {
    ...query,
    data: query.data?.event,
    isTransitioning: query.isFetching && query.data?.transition !== undefined,
    transition: query.isFetching ? query.data?.transition : undefined,
    refresh: () => startTransition('refresh'),
    watchDeployment: (deploymentId: string) => startTransition('spin-up', deploymentId),
  }
}
