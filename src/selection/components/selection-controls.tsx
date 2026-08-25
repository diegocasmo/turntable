import { Navigate, useNavigate, useSearch } from '@tanstack/react-router'
import type { ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@/components/ui/native-select'
import type { EnvironmentOption } from '@/gql/operations/project-environments'
import type { ProjectOption } from '@/gql/operations/projects'
import { useReadEnvironments } from '@/selection/hooks/use-read-environments'
import { useReadProjects } from '@/selection/hooks/use-read-projects'
import { useReadServices } from '@/selection/hooks/use-read-services'
import type { SelectionSearch } from '@/selection/schema'

type NamedOption = Readonly<{ id: string; name: string }>
type OptionGroup = NamedOption & { options: ProjectOption[] }

function compareOptions(left: NamedOption, right: NamedOption) {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
}

function sortOptions<Option extends NamedOption>(options: readonly Option[] | undefined) {
  return [...(options ?? [])].sort(compareOptions)
}

function findOption<Option extends NamedOption>(
  options: readonly Option[] | undefined,
  id: string | undefined,
) {
  return id === undefined ? undefined : options?.find((option) => option.id === id)
}

function groupProjects(projects: readonly ProjectOption[] | undefined) {
  const groups = new Map<string, OptionGroup>()
  for (const project of projects ?? []) {
    const workspace = project.workspace ?? { id: '', name: 'Workspace unavailable' }
    const group = groups.get(workspace.id)
    if (group) group.options.push(project)
    else groups.set(workspace.id, { ...workspace, options: [project] })
  }
  return sortOptions([...groups.values()])
}

function readDefaultEnvironment(
  project: ProjectOption | undefined,
  environments: readonly EnvironmentOption[] | undefined,
) {
  if (!project || !environments) return undefined
  return (
    findOption(environments, project.primaryEnvironmentId ?? undefined) ??
    (environments.length === 1 ? environments[0] : undefined)
  )
}

type PickerState = Readonly<{
  data: readonly NamedOption[] | undefined
  error: unknown
  isPending: boolean
}>
type PickerProps = Readonly<{
  blockedBy?: string | undefined
  groups?: readonly OptionGroup[]
  label: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  state: PickerState
  value: string
}>

function Picker({ blockedBy, groups, label, onChange, state, value }: PickerProps) {
  const noun = label.toLowerCase()
  const placeholder = blockedBy
    ? `Choose a ${blockedBy} first`
    : state.isPending
      ? `Loading ${noun}s...`
      : state.error
        ? `${label}s unavailable`
        : state.data?.length === 0
          ? `No ${noun}s`
          : `Choose a ${noun}`
  const disabled = !!blockedBy || state.isPending || !!state.error || state.data?.length === 0

  return (
    <label htmlFor={label} className="block border-t border-[#4d4e47] pt-4">
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#c9c5b9]">{label}</span>
      <NativeSelect
        id={label}
        aria-describedby="selection-status"
        className="mt-2 w-full"
        disabled={disabled}
        value={value}
        onChange={onChange}
      >
        <NativeSelectOption value="" disabled>
          {placeholder}
        </NativeSelectOption>
        {groups
          ? groups.map((group) => (
              <NativeSelectOptGroup key={group.id} label={group.name}>
                {sortOptions(group.options).map((option) => (
                  <NativeSelectOption key={option.id} value={option.id}>
                    {option.name}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            ))
          : sortOptions(state.data).map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.name}
              </NativeSelectOption>
            ))}
      </NativeSelect>
    </label>
  )
}

export function SelectionControls() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const projects = useReadProjects()
  const project = findOption(projects.data, search.projectId)
  const environments = useReadEnvironments(project?.id)
  const environment = findOption(environments.data, search.environmentId)
  const services = useReadServices(project?.id, environment?.id)
  const service = findOption(services.data, search.serviceId)
  const defaultEnvironment = readDefaultEnvironment(project, environments.data)
  let automaticSearch: SelectionSearch | undefined
  if (search.projectId === undefined && projects.data?.length === 1) {
    automaticSearch = { ...search, projectId: projects.data[0]?.id }
  } else if (search.environmentId === undefined && defaultEnvironment) {
    automaticSearch = { ...search, environmentId: defaultEnvironment.id }
  } else if (search.serviceId === undefined && services.data?.length === 1) {
    automaticSearch = { ...search, serviceId: services.data[0]?.id }
  }

  const status =
    search.projectId && projects.data && !project
      ? 'The selected project is no longer available. Choose another project.'
      : search.environmentId && environments.data && project && !environment
        ? 'The selected environment is no longer available. Choose another environment.'
        : search.serviceId && services.data && environment && !service
          ? 'The selected service is no longer available. Choose another service.'
          : service
            ? `${service.name} is selected.`
            : environment
              ? 'Choose a service.'
              : project
                ? 'Choose an environment.'
                : 'Choose a project.'
  const failure = [projects, environments, services].find((query) => query.error)

  function selectProject(event: ChangeEvent<HTMLSelectElement>) {
    void navigate({ search: { projectId: event.currentTarget.value } })
  }

  function selectEnvironment(event: ChangeEvent<HTMLSelectElement>) {
    void navigate({ search: { projectId: project?.id, environmentId: event.currentTarget.value } })
  }

  function selectService(event: ChangeEvent<HTMLSelectElement>) {
    void navigate({
      search: {
        projectId: project?.id,
        environmentId: environment?.id,
        serviceId: event.currentTarget.value,
      },
    })
  }

  return (
    <div className="mt-8 space-y-5">
      {automaticSearch ? <Navigate to="/" search={automaticSearch} replace /> : null}
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8f8c81]">
          Target / Railway
        </p>
        <h3 className="mt-2 text-2xl leading-tight">Choose a service</h3>
      </div>
      <Picker
        label="Project"
        state={projects}
        value={project?.id ?? ''}
        onChange={selectProject}
        groups={groupProjects(projects.data)}
      />
      <Picker
        label="Environment"
        blockedBy={project ? undefined : 'project'}
        state={environments}
        value={environment?.id ?? ''}
        onChange={selectEnvironment}
      />
      <Picker
        label="Service"
        blockedBy={environment ? undefined : 'environment'}
        state={services}
        value={service?.id ?? ''}
        onChange={selectService}
      />
      <p
        id="selection-status"
        aria-label="Selection status"
        role="status"
        className="text-sm leading-6 text-[#c9c5b9]"
      >
        {status}
      </p>
      {failure?.error ? (
        <div className="border-l-2 border-[#d97767] bg-[#2d201e] px-4 py-3">
          <p role="alert" className="text-sm leading-6 text-[#f0b8ae]">
            {failure.error.message}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 border-[#d97767] bg-transparent text-[#f0b8ae]"
            onClick={() => void failure.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  )
}
