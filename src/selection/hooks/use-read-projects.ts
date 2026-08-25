import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useReadSelectionResult } from '@/selection/hooks/use-read-selection-result'
import { readProjects } from '@/selection/read-projects'

export function useReadProjects() {
  const read = useServerFn(readProjects)
  const readResult = useReadSelectionResult()
  return useQuery({
    queryFn: () => readResult(read({})),
    queryKey: ['projects'],
    retry: false,
  })
}
