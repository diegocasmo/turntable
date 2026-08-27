import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import {
  createEnvironmentsQueryOptions,
  createProjectsQueryOptions,
  createServicesQueryOptions,
} from '@/selection/query-options'
import type { SessionState } from '@/session/schema'

type LoaderContext = Readonly<{
  queryClient: QueryClient
  sessionState: SessionState
}>

function findEntity(entities: readonly Readonly<{ id: string }>[], id: string) {
  return entities.find((entity) => entity.id === id)
}

function throwMissingSelection(href: string, message: string): never {
  throw redirect({
    href,
    replace: true,
    state: (state) => ({ ...state, selectionNotice: message }),
  })
}

export async function loadProjectsRoute(context: LoaderContext) {
  if (context.sessionState !== 'authenticated') return
  await context.queryClient.ensureQueryData(createProjectsQueryOptions())
}

export async function loadEnvironmentsRoute(context: LoaderContext, projectId: string) {
  if (context.sessionState !== 'authenticated') return
  const projects = await context.queryClient.ensureQueryData(createProjectsQueryOptions())
  if (!findEntity(projects, projectId)) {
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
  if (context.sessionState !== 'authenticated') return
  const environments = context.queryClient.getQueryData(
    createEnvironmentsQueryOptions(projectId).queryKey,
  )
  if (!environments || !findEntity(environments, environmentId)) {
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
  if (!findEntity(projects, projectId)) return 'project-missing' as const
  await queryClient.fetchQuery({ ...createEnvironmentsQueryOptions(projectId), staleTime: 0 })
  return 'valid' as const
}

export async function refreshServicesRoute(
  queryClient: QueryClient,
  projectId: string,
  environmentId: string,
) {
  const projects = await queryClient.fetchQuery({ ...createProjectsQueryOptions(), staleTime: 0 })
  if (!findEntity(projects, projectId)) return 'project-missing' as const
  const environments = await queryClient.fetchQuery({
    ...createEnvironmentsQueryOptions(projectId),
    staleTime: 0,
  })
  if (!findEntity(environments, environmentId)) return 'environment-missing' as const
  await queryClient.fetchQuery({
    ...createServicesQueryOptions(projectId, environmentId),
    staleTime: 0,
  })
  return 'valid' as const
}
