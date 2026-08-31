import { queryOptions } from '@tanstack/react-query'
import { isDeploymentStatusTransitional } from '@/railway/deployment-status'
import { readEnvironment } from '@/selection/read-environment'
import { readEnvironments } from '@/selection/read-environments'
import { readProject } from '@/selection/read-project'
import { readProjects } from '@/selection/read-projects'
import { readServices } from '@/selection/read-services'

export const createProjectsQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => readProjects({ signal }),
    queryKey: ['projects'] as const,
  })
export const createProjectQueryOptions = (projectId: string) =>
  queryOptions({
    queryFn: ({ signal }) => readProject({ data: { projectId }, signal }),
    queryKey: ['projects', 'detail', projectId] as const,
  })
export const createEnvironmentsQueryOptions = (projectId: string) =>
  queryOptions({
    queryFn: ({ signal }) => readEnvironments({ data: { projectId }, signal }),
    queryKey: ['projects', projectId, 'environments'] as const,
  })
export const createEnvironmentQueryOptions = (projectId: string, environmentId: string) =>
  queryOptions({
    queryFn: ({ signal }) => readEnvironment({ data: { environmentId, projectId }, signal }),
    queryKey: ['projects', projectId, 'environments', 'detail', environmentId] as const,
  })
export const createServicesQueryOptions = (
  projectId: string,
  environmentId: string,
  continueSynchronizing = false,
) =>
  queryOptions({
    queryFn: ({ signal }) => readServices({ data: { environmentId, projectId }, signal }),
    queryKey: ['projects', projectId, 'environments', environmentId, 'services'] as const,
    refetchInterval: (query) => {
      const hasTransitionalService = query.state.data?.some(
        (service) =>
          service.deployment !== null && isDeploymentStatusTransitional(service.deployment.status),
      )

      return continueSynchronizing || hasTransitionalService || query.state.isInvalidated
        ? 5_000
        : false
    },
  })
