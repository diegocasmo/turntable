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

function throwMissingEnvironment(): never {
  throw redirect({
    replace: true,
    search: { notice: 'unavailable' },
    to: '/projects',
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

async function readEnvironmentForRoute(queryClient: QueryClient, environmentId: string) {
  const detailOptions = createEnvironmentQueryOptions(environmentId)
  const detail = queryClient.getQueryData(detailOptions.queryKey)
  if (detail) {
    const environments = queryClient.getQueryData(
      createEnvironmentsQueryOptions(detail.projectId).queryKey,
    )
    const environment = environments?.find(({ id }) => id === environmentId)
    if (environment) return environment
    if (environments === undefined) return detail
  }

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
  const environments = await context.queryClient.ensureQueryData(
    createEnvironmentsQueryOptions(projectId),
  )
  for (const environment of environments) {
    context.queryClient.setQueryData(
      createEnvironmentQueryOptions(environment.id).queryKey,
      environment,
    )
  }
  return { project }
}

export async function loadServicesRoute(context: LoaderContext, environmentId: string) {
  const environment = await readEnvironmentForRoute(context.queryClient, environmentId)
  if (!environment) {
    throwMissingEnvironment()
  }
  const project = await readProjectForRoute(context.queryClient, environment.projectId)
  if (!project) {
    throwMissingProject()
  }
  await context.queryClient.ensureQueryData(
    createServicesQueryOptions(environment.projectId, environmentId),
  )
  return { environment, project }
}
