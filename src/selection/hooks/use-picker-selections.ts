import { useNavigate, useSearch } from '@tanstack/react-router'
import type { ProjectOption } from '@/gql/operations/projects'
import type { PickerOption, PickerState } from '@/selection/components/picker'
import { useReadEnvironments } from '@/selection/hooks/use-read-environments'
import { useReadProjects } from '@/selection/hooks/use-read-projects'
import { useReadServices } from '@/selection/hooks/use-read-services'
import { resolvePickerSelection } from '@/selection/resolve-picker-selection'
import type { SelectionSearch } from '@/selection/schema'

function compareOptions(left: PickerOption, right: PickerOption) {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
}

function sortOptions<Option extends PickerOption>(options: readonly Option[] | undefined) {
  return [...(options ?? [])].sort(compareOptions)
}

function groupProjects(projects: readonly ProjectOption[] | undefined) {
  const groups = new Map<string, { id: string; name: string; options: ProjectOption[] }>()
  for (const project of projects ?? []) {
    const workspace = project.workspace ?? { id: '', name: 'Workspace unavailable' }
    const group = groups.get(workspace.id)
    if (group) group.options.push(project)
    else groups.set(workspace.id, { ...workspace, options: [project] })
  }
  return sortOptions([...groups.values()]).map((group) => ({
    ...group,
    options: sortOptions(group.options),
  }))
}

type PickerQuery = {
  data: readonly PickerOption[] | undefined
  error: Error | null
  isPending: boolean
}

function resolvePickerState(query: PickerQuery, parent?: string): PickerState {
  if (parent) return { kind: 'blocked', parent }
  if (query.isPending) return { kind: 'loading' }
  if (query.error) return { kind: 'unavailable' }
  if (query.data?.length === 0) return { kind: 'empty' }
  return { kind: 'ready' }
}

function resolveStatus(
  project: ReturnType<typeof resolvePickerSelection>,
  environment: ReturnType<typeof resolvePickerSelection>,
  service: ReturnType<typeof resolvePickerSelection>,
  pending: { project: boolean; environment: boolean; service: boolean },
) {
  if (pending.project) return 'Loading projects.'
  if (project.selectedOption && pending.environment) return 'Loading environments.'
  if (environment.selectedOption && pending.service) return 'Loading services.'
  if (project.isStale) return 'The selected project is no longer available. Choose another project.'
  if (environment.isStale)
    return 'The selected environment is no longer available. Choose another environment.'
  if (service.isStale) return 'The selected service is no longer available. Choose another service.'
  if (service.selectedOption) return undefined
  if (environment.selectedOption) return 'Choose a service.'
  if (project.selectedOption) return 'Choose an environment.'
  return 'Choose a project.'
}

function resolveSearchWithDefaultOption(
  search: SelectionSearch,
  project: ReturnType<typeof resolvePickerSelection>,
  environment: ReturnType<typeof resolvePickerSelection>,
  service: ReturnType<typeof resolvePickerSelection>,
) {
  if (project.defaultOption) return { ...search, projectId: project.defaultOption.id }
  if (environment.defaultOption) return { ...search, environmentId: environment.defaultOption.id }
  if (service.defaultOption) return { ...search, serviceId: service.defaultOption.id }
}

export function usePickerSelections() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const projectsQuery = useReadProjects()
  const project = resolvePickerSelection(projectsQuery.data, search.projectId)
  const environmentsQuery = useReadEnvironments(project.selectedOption?.id)
  const environment = resolvePickerSelection(
    environmentsQuery.data,
    search.environmentId,
    project.selectedOption?.primaryEnvironmentId ?? undefined,
  )
  const servicesQuery = useReadServices(project.selectedOption?.id, environment.selectedOption?.id)
  const service = resolvePickerSelection(servicesQuery.data, search.serviceId)
  const failedQuery = [projectsQuery, environmentsQuery, servicesQuery].find(({ error }) => error)
  const failure = failedQuery?.error
    ? { message: failedQuery.error.message, retry: () => void failedQuery.refetch() }
    : undefined
  const status = resolveStatus(project, environment, service, {
    project: projectsQuery.isPending,
    environment: environmentsQuery.isPending,
    service: servicesQuery.isPending,
  })
  const searchWithDefaultOption = resolveSearchWithDefaultOption(
    search,
    project,
    environment,
    service,
  )
  const deploymentTarget =
    project.selectedOption && environment.selectedOption && service.selectedOption
      ? {
          environmentId: environment.selectedOption.id,
          projectId: project.selectedOption.id,
          serviceId: service.selectedOption.id,
        }
      : undefined

  return {
    project: {
      groups: groupProjects(projectsQuery.data),
      label: 'Project',
      onSelect: (projectId: string) => void navigate({ resetScroll: false, search: { projectId } }),
      selectedOption: project.selectedOption,
      state: resolvePickerState(projectsQuery),
    },
    environment: {
      label: 'Environment',
      onSelect: (environmentId: string) =>
        void navigate({
          resetScroll: false,
          search: { environmentId, projectId: project.selectedOption?.id },
        }),
      options: sortOptions(environmentsQuery.data),
      selectedOption: environment.selectedOption,
      state: resolvePickerState(environmentsQuery, project.selectedOption ? undefined : 'project'),
    },
    service: {
      label: 'Service',
      onSelect: (serviceId: string) =>
        void navigate({ resetScroll: false, search: { ...search, serviceId } }),
      options: sortOptions(servicesQuery.data),
      selectedOption: service.selectedOption,
      state: resolvePickerState(
        servicesQuery,
        environment.selectedOption ? undefined : 'environment',
      ),
    },
    failure,
    deploymentTarget,
    searchWithDefaultOption,
    status,
  }
}
