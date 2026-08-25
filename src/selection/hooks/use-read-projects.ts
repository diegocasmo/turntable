import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { readProjects } from '@/selection/read-projects'

export function useReadProjects() {
  const read = useServerFn(readProjects)
  return useQuery({
    queryFn: () => read({}),
    queryKey: ['selection', 'projects'],
    retry: false,
  })
}
