import { skipToken, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { readEnvironments } from '@/selection/read-environments'

export function useReadEnvironments(projectId: string | undefined) {
  const read = useServerFn(readEnvironments)
  return useQuery({
    queryFn: projectId === undefined ? skipToken : () => read({ data: { projectId } }),
    queryKey: ['selection', 'environments', projectId],
    retry: false,
  })
}
