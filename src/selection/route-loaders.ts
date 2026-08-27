import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { findEntityById } from '@/selection/find-entity-by-id'
import {
  createEnvironmentsQueryOptions,
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

export async function loadProjectsRoute(context: LoaderContext) {
  await context.queryClient.ensureQueryData(createProjectsQueryOptions())
}

export async function loadEnvironmentsRoute(context: LoaderContext, projectId: string) {
  const projects = await context.queryClient.ensureQueryData(createProjectsQueryOptions())
  if (!findEntityById(projects, projectId)) {
    throwMissingSelection('/projects', 'The selected project is no longer available.')
  }
  await context.queryClient.ensureQueryData(createEnvironmentsQueryOptions(projectId))
}

export async function loadServicesRoute(
  context: LoaderContext,
  projectId: string,
  environmentId: string,
) {
  await loadEnvironmentsRoute(context, projectId)
  const environments = context.queryClient.getQueryData(
    createEnvironmentsQueryOptions(projectId).queryKey,
  )
  if (!findEntityById(environments, environmentId)) {
    throwMissingSelection(
      `/projects/${projectId}/environments`,
      'The selected environment is no longer available.',
    )
  }
  await context.queryClient.ensureQueryData(createServicesQueryOptions(projectId, environmentId))
}

export async function refreshProjectsRoute(queryClient: QueryClient) {
  await queryClient.fetchQuery({ ...createProjectsQueryOptions(), staleTime: 0 })
}

export async function refreshEnvironmentsRoute(queryClient: QueryClient, projectId: string) {
  const projects = await queryClient.fetchQuery({
    ...createProjectsQueryOptions(),
    staleTime: 0,
  })
  if (!findEntityById(projects, projectId)) return 'project-missing' as const
  await queryClient.fetchQuery({ ...createEnvironmentsQueryOptions(projectId), staleTime: 0 })
  return 'valid' as const
}

export async function refreshServicesRoute(
  queryClient: QueryClient,
  projectId: string,
  environmentId: string,
) {
  const projects = await queryClient.fetchQuery({ ...createProjectsQueryOptions(), staleTime: 0 })
  if (!findEntityById(projects, projectId)) return 'project-missing' as const
  const environments = await queryClient.fetchQuery({
    ...createEnvironmentsQueryOptions(projectId),
    staleTime: 0,
  })
  if (!findEntityById(environments, environmentId)) return 'environment-missing' as const
  await queryClient.fetchQuery({
    ...createServicesQueryOptions(projectId, environmentId),
    staleTime: 0,
  })
  return 'valid' as const
}
