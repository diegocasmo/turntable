import { queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/query-keys'
import { readEnvironments } from '@/selection/read-environments'
import { readProjects } from '@/selection/read-projects'
import { readServices } from '@/selection/read-services'

export const createProjectsQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => readProjects({ signal }),
    queryKey: queryKeys.projects.list,
  })
export const createEnvironmentsQueryOptions = (projectId: string) =>
  queryOptions({
    queryFn: ({ signal }) => readEnvironments({ data: { projectId }, signal }),
    queryKey: queryKeys.environments.list(projectId),
  })
export const createServicesQueryOptions = (projectId: string, environmentId: string) =>
  queryOptions({
    queryFn: ({ signal }) => readServices({ data: { environmentId, projectId }, signal }),
    queryKey: queryKeys.services.list(projectId, environmentId),
  })
