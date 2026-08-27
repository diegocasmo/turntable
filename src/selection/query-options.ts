import { queryOptions } from '@tanstack/react-query'
import { readEnvironments } from '@/selection/read-environments'
import { readProjects } from '@/selection/read-projects'
import { readServices } from '@/selection/read-services'

export function createProjectsQueryOptions() {
  return queryOptions({
    queryFn: ({ signal }) => readProjects({ signal }),
    queryKey: ['projects'],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function createEnvironmentsQueryOptions(projectId: string) {
  return queryOptions({
    queryFn: ({ signal }) => readEnvironments({ data: { projectId }, signal }),
    queryKey: ['projects', projectId, 'environments'],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function createServicesQueryOptions(projectId: string, environmentId: string) {
  return queryOptions({
    queryFn: ({ signal }) => readServices({ data: { environmentId, projectId }, signal }),
    queryKey: ['projects', projectId, 'environments', environmentId, 'services'],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}
