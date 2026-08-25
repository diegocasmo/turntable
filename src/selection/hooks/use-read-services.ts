import { skipToken, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { readServices } from '@/selection/read-services'

export function useReadServices(projectId: string | undefined, environmentId: string | undefined) {
  const read = useServerFn(readServices)
  return useQuery({
    queryFn:
      projectId === undefined || environmentId === undefined
        ? skipToken
        : () => read({ data: { environmentId, projectId } }),
    queryKey: ['services', projectId, environmentId],
    retry: false,
  })
}
