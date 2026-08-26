import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { readSelectionHierarchy } from '@/selection/read-selection-hierarchy'

export function useReadSelectionHierarchy() {
  const read = useServerFn(readSelectionHierarchy)
  return useQuery({
    queryFn: () => read({}),
    queryKey: ['selection-hierarchy'],
    retry: false,
  })
}
