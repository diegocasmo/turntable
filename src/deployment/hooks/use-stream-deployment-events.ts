import {
  skipToken,
  experimental_streamedQuery as streamedQuery,
  useQuery,
} from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import type { DeploymentStreamEvent } from '@/deployment/event-stream'
import type { DeploymentTarget } from '@/deployment/schema'
import { streamDeploymentEvents } from '@/deployment/stream-deployment-events'
import { useDisconnectSession } from '@/session/hooks/use-disconnect-session'

function reduceDeploymentEvents(
  current: DeploymentStreamEvent | undefined,
  event: DeploymentStreamEvent,
) {
  return event.type === 'heartbeat' ? current : event
}

export function useStreamDeploymentEvents(target: DeploymentTarget | undefined) {
  const disconnect = useDisconnectSession()
  const stream = useServerFn(streamDeploymentEvents)

  return useQuery({
    queryFn:
      target === undefined
        ? skipToken
        : streamedQuery({
            initialValue: undefined,
            reducer: reduceDeploymentEvents,
            streamFn: async function* ({ signal }) {
              const events = await stream({ data: target, signal })

              for await (const event of events) {
                if (event.type === 'session-expired') {
                  await disconnect.mutateAsync({})
                  return
                }

                yield event
              }
            },
          }),
    queryKey: ['deployment', target?.projectId, target?.environmentId, target?.serviceId],
    staleTime: Infinity,
  })
}
