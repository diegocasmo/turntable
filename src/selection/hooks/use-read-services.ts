import { skipToken, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useReadSelectionResult } from '@/selection/hooks/use-read-selection-result'
import { readServices } from '@/selection/read-services'

export function useReadServices(projectId: string | undefined, environmentId: string | undefined) {
  const read = useServerFn(readServices)
  const readResult = useReadSelectionResult()
  return useQuery({
    queryFn:
      projectId === undefined || environmentId === undefined
        ? skipToken
        : () => readResult(read({ data: { environmentId, projectId } })),
    queryKey: ['services', projectId, environmentId],
    retry: false,
  })
}
