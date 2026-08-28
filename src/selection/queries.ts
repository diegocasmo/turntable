import { queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/query-keys'
import { isDeploymentStatusTransitional } from '@/railway/deployment-status'
import { readEnvironment } from '@/selection/read-environment'
import { readEnvironments } from '@/selection/read-environments'
import { readProject } from '@/selection/read-project'
import { readProjects } from '@/selection/read-projects'
import { readServices } from '@/selection/read-services'

export const createProjectsQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => readProjects({ signal }),
    queryKey: queryKeys.projects.list,
  })
export const createProjectQueryOptions = (projectId: string) =>
  queryOptions({
    queryFn: ({ signal }) => readProject({ data: { projectId }, signal }),
    queryKey: queryKeys.projects.detail(projectId),
  })
export const createEnvironmentsQueryOptions = (projectId: string) =>
  queryOptions({
    queryFn: ({ signal }) => readEnvironments({ data: { projectId }, signal }),
    queryKey: queryKeys.environments.list(projectId),
  })
export const createEnvironmentQueryOptions = (projectId: string, environmentId: string) =>
  queryOptions({
    queryFn: ({ signal }) => readEnvironment({ data: { environmentId, projectId }, signal }),
    queryKey: queryKeys.environments.detail(projectId, environmentId),
  })
export const createServicesQueryOptions = (
  projectId: string,
  environmentId: string,
  continueSynchronizing = false,
) =>
  queryOptions({
    queryFn: ({ signal }) => readServices({ data: { environmentId, projectId }, signal }),
    queryKey: queryKeys.services.list(projectId, environmentId),
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
