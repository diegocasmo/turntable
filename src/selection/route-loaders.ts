import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
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
  const project = projects?.find(({ id }) => id === projectId)
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
  const environment = environments?.find(({ id }) => id === environmentId)
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
