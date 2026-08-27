import { useNavigate, useSearch } from '@tanstack/react-router'
import type { SelectionProject } from '@/gql/operations/projects'
import type { PickerOption, PickerState } from '@/selection/components/picker'
import { resolvePickerSelection } from '@/selection/resolve-picker-selection'

function compareOptions(left: PickerOption, right: PickerOption) {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
}

function sortOptions<Option extends PickerOption>(options: readonly Option[] | undefined) {
  return [...(options ?? [])].sort(compareOptions)
}

function groupProjects(projects: readonly SelectionProject[]) {
  const groups = new Map<string, { id: string; items: SelectionProject[]; name: string }>()
  for (const project of projects) {
    const workspace = project.workspace ?? { id: '', name: 'Workspace unavailable' }
    const group = groups.get(workspace.id)
    if (group) group.items.push(project)
    else groups.set(workspace.id, { ...workspace, items: [project] })
  }
  return sortOptions([...groups.values()]).map((group) => ({
    ...group,
    items: sortOptions(group.items),
  }))
}

function resolvePickerState(options: readonly PickerOption[], parent?: string): PickerState {
  if (parent) return { kind: 'blocked', parent }
  if (options.length === 0) return { kind: 'empty' }
  return { kind: 'ready' }
}

function resolveStatus(
  project: ReturnType<typeof resolvePickerSelection>,
  environment: ReturnType<typeof resolvePickerSelection>,
  service: ReturnType<typeof resolvePickerSelection>,
) {
  if (project.isStale) return 'The selected project is no longer available. Choose another project.'
  if (environment.isStale)
    return 'The selected environment is no longer available. Choose another environment.'
  if (service.isStale) return 'The selected service is no longer available. Choose another service.'
  if (service.selectedOption) return undefined
  if (environment.selectedOption) return 'Choose a service.'
  if (project.selectedOption) return 'Choose an environment.'
  return 'Choose a project.'
}

export function usePickerSelections(projects: readonly SelectionProject[]) {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const project = resolvePickerSelection(projects, search.projectId)
  const environments = project.selectedOption?.environments ?? []
  const environment = resolvePickerSelection(environments, search.environmentId)
  const services = environment.selectedOption?.services ?? []
  const service = resolvePickerSelection(services, search.serviceId)
  const status = resolveStatus(project, environment, service)
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
      groups: groupProjects(projects),
      label: 'Project',
      onSelect: (projectId: string) => void navigate({ resetScroll: false, search: { projectId } }),
      selectedOption: project.selectedOption,
      state: resolvePickerState(projects),
    },
    environment: {
      label: 'Environment',
      onSelect: (environmentId: string) =>
        void navigate({
          resetScroll: false,
          search: { environmentId, projectId: project.selectedOption?.id },
        }),
      options: sortOptions(environments),
      selectedOption: environment.selectedOption,
      state: resolvePickerState(environments, project.selectedOption ? undefined : 'project'),
    },
    service: {
      label: 'Service',
      onSelect: (serviceId: string) =>
        void navigate({ resetScroll: false, search: { ...search, serviceId } }),
      options: sortOptions(services),
      selectedOption: service.selectedOption,
      state: resolvePickerState(services, environment.selectedOption ? undefined : 'environment'),
    },
    deploymentTarget,
    status,
  }
}
