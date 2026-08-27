import { queryOptions } from '@tanstack/react-query'
import { isDeploymentStatusTransitional } from '@/railway/deployment-status'
import { readEnvironments } from '@/selection/read-environments'
import { readProjects } from '@/selection/read-projects'
import { readServices } from '@/selection/read-services'

export const selectionQueryKeys = {
  environments: (projectId: string) => ['selection', 'environments', projectId] as const,
  projects: ['selection', 'projects'] as const,
  services: (projectId: string, environmentId: string) =>
    ['selection', 'services', projectId, environmentId] as const,
}

export function createProjectsQueryOptions() {
  return queryOptions({
    queryFn: ({ signal }) => readProjects({ signal }),
    queryKey: selectionQueryKeys.projects,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function createEnvironmentsQueryOptions(projectId: string) {
  return queryOptions({
    queryFn: ({ signal }) => readEnvironments({ data: { projectId }, signal }),
    queryKey: selectionQueryKeys.environments(projectId),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function createServicesQueryOptions(projectId: string, environmentId: string) {
  return queryOptions({
    queryFn: ({ signal }) => readServices({ data: { environmentId, projectId }, signal }),
    queryKey: selectionQueryKeys.services(projectId, environmentId),
    refetchInterval: (query) => {
      const hasTransitionalService = query.state.data?.some(
        (service) =>
          service.deployment !== null && isDeploymentStatusTransitional(service.deployment.status),
      )

      return hasTransitionalService || query.state.isInvalidated ? 5_000 : false
    },
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}
