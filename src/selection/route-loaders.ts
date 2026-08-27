import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { findEntityById } from '@/selection/find-entity-by-id'
import {
  createEnvironmentQueryOptions,
  createEnvironmentsQueryOptions,
  createProjectQueryOptions,
  createProjectsQueryOptions,
  createServicesQueryOptions,
} from '@/selection/queries'

type LoaderContext = Readonly<{
  queryClient: QueryClient
}>

function throwMissingSelection(href: string, message: string): never {
  throw redirect({
    href,
    replace: true,
    state: (state) => ({ ...state, selectionNotice: message }),
  })
}

async function readProjectForRoute(queryClient: QueryClient, projectId: string) {
  const projects = queryClient.getQueryData(createProjectsQueryOptions().queryKey)
  const project = findEntityById(projects, projectId)
  if (project) return project

  const detailOptions = createProjectQueryOptions(projectId)
  const detail = queryClient.getQueryData(detailOptions.queryKey)
  if (projects === undefined && detail) return detail

  return queryClient.fetchQuery(detailOptions)
}

async function readEnvironmentForRoute(
  queryClient: QueryClient,
  projectId: string,
  environmentId: string,
) {
  const environments = queryClient.getQueryData(createEnvironmentsQueryOptions(projectId).queryKey)
  const environment = findEntityById(environments, environmentId)
  if (environment) return environment

  const detailOptions = createEnvironmentQueryOptions(projectId, environmentId)
  const detail = queryClient.getQueryData(detailOptions.queryKey)
  if (environments === undefined && detail) return detail

  return queryClient.fetchQuery(detailOptions)
}

export async function loadProjectsRoute(context: LoaderContext) {
  await context.queryClient.ensureQueryData(createProjectsQueryOptions())
}

export async function loadEnvironmentsRoute(context: LoaderContext, projectId: string) {
  const project = await readProjectForRoute(context.queryClient, projectId)
  if (!project) {
    throwMissingSelection('/projects', 'The selected project is no longer available.')
  }
  await context.queryClient.ensureQueryData(createEnvironmentsQueryOptions(projectId))
  return { project }
}

export async function loadServicesRoute(
  context: LoaderContext,
  projectId: string,
  environmentId: string,
) {
  const project = await readProjectForRoute(context.queryClient, projectId)
  if (!project) {
    throwMissingSelection('/projects', 'The selected project is no longer available.')
  }
  const environment = await readEnvironmentForRoute(context.queryClient, projectId, environmentId)
  if (!environment) {
    throwMissingSelection(
      `/projects/${projectId}/environments`,
      'The selected environment is no longer available.',
    )
  }
  await context.queryClient.ensureQueryData(createServicesQueryOptions(projectId, environmentId))
  return { environment, project }
}

export async function refreshProjectsRoute(queryClient: QueryClient) {
  await queryClient.fetchQuery(createProjectsQueryOptions())
}

export async function refreshEnvironmentsRoute(queryClient: QueryClient, projectId: string) {
  const project = await queryClient.fetchQuery(createProjectQueryOptions(projectId))
  if (!project) {
    queryClient.removeQueries({ exact: true, queryKey: createProjectsQueryOptions().queryKey })
    return 'project-missing' as const
  }
  await queryClient.fetchQuery(createEnvironmentsQueryOptions(projectId))
  return 'valid' as const
}

export async function refreshServicesRoute(
  queryClient: QueryClient,
  projectId: string,
  environmentId: string,
) {
  const project = await queryClient.fetchQuery(createProjectQueryOptions(projectId))
  if (!project) {
    queryClient.removeQueries({ exact: true, queryKey: createProjectsQueryOptions().queryKey })
    return 'project-missing' as const
  }
  const environment = await queryClient.fetchQuery(
    createEnvironmentQueryOptions(projectId, environmentId),
  )
  if (!environment) {
    queryClient.removeQueries({
      exact: true,
      queryKey: createEnvironmentsQueryOptions(projectId).queryKey,
    })
    return 'environment-missing' as const
  }
  await queryClient.fetchQuery(createServicesQueryOptions(projectId, environmentId))
  return 'valid' as const
}
