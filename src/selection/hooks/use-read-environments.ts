import { skipToken, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useReadSelectionResult } from '@/selection/hooks/use-read-selection-result'
import { readEnvironments } from '@/selection/read-environments'

export function useReadEnvironments(projectId: string | undefined) {
  const read = useServerFn(readEnvironments)
  const readResult = useReadSelectionResult()
  return useQuery({
    queryFn: projectId === undefined ? skipToken : () => readResult(read({ data: { projectId } })),
    queryKey: ['environments', projectId],
    retry: false,
  })
}
