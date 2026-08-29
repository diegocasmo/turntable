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

function throwMissingProject(): never {
  throw redirect({
    replace: true,
    search: { notice: 'unavailable' },
    to: '/projects',
  })
}

function throwMissingEnvironment(projectId: string): never {
  throw redirect({
    params: { projectId },
    replace: true,
    search: { notice: 'unavailable' },
    to: '/projects/$projectId/environments',
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
    throwMissingProject()
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
    throwMissingProject()
  }
  const environment = await readEnvironmentForRoute(context.queryClient, projectId, environmentId)
  if (!environment) {
    throwMissingEnvironment(projectId)
  }
  await context.queryClient.ensureQueryData(createServicesQueryOptions(projectId, environmentId))
  return { environment, project }
}
