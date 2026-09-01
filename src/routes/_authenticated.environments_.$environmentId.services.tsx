import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, type ErrorComponentProps } from '@tanstack/react-router'
import { useState } from 'react'
import {
  type AcceptedServiceOperation,
  ServiceActions,
} from '@/deployment/components/service-actions'
import { StatusBadge } from '@/deployment/components/status-badge'
import { EntityCard } from '@/selection/components/entity-card-grid'
import { SelectionListPage } from '@/selection/components/selection-list-page'
import {
  SelectionRouteError,
  SelectionRoutePending,
} from '@/selection/components/selection-route-state'
import {
  createEnvironmentQueryOptions,
  createProjectQueryOptions,
  createServicesQueryOptions,
} from '@/selection/queries'
import { loadServicesRoute } from '@/selection/route-loaders'
import { entitySearchSchema } from '@/selection/schema'

type PendingServiceOperation = AcceptedServiceOperation &
  Readonly<{ previousDeploymentId: string | null }>

function checkServiceOperationIsVisible(
  operation: PendingServiceOperation,
  services: ReadonlyArray<{
    deployment: Readonly<{ id: string }> | null
    id: string
  }>,
) {
  const service = services.find(({ id }) => id === operation.serviceId)
  if (!service) return true

  const deploymentId = service.deployment?.id ?? null
  return operation.action === 'spin-down'
    ? deploymentId !== operation.deploymentId
    : deploymentId === operation.deploymentId || deploymentId !== operation.previousDeploymentId
}

function useServiceSelectionProgress() {
  const { environmentId } = Route.useParams()
  const environment = useQuery({
    ...createEnvironmentQueryOptions(environmentId),
    enabled: false,
  }).data
  const project = useQuery({
    ...createProjectQueryOptions(environment?.projectId ?? ''),
    enabled: false,
  }).data

  return {
    ...(environment ? { environmentName: environment.name, projectId: environment.projectId } : {}),
    ...(project ? { projectName: project.name } : {}),
    step: 'services' as const,
  }
}

function ServiceRoutePending() {
  return (
    <SelectionRoutePending
      selectionProgress={useServiceSelectionProgress()}
      title="Loading services"
    />
  )
}

function ServiceRouteError(props: ErrorComponentProps) {
  return (
    <SelectionRouteError
      {...props}
      selectionProgress={useServiceSelectionProgress()}
      title="Could not load services"
    />
  )
}

export const Route = createFileRoute('/_authenticated/environments_/$environmentId/services')({
  validateSearch: entitySearchSchema,
  loader: ({ context, params }) => loadServicesRoute(context, params.environmentId),
  pendingComponent: ServiceRoutePending,
  errorComponent: ServiceRouteError,
  component: ServiceRoute,
})

function ServiceRoute() {
  const { environment, project } = Route.useLoaderData()
  const { environmentId } = Route.useParams()
  const projectId = project.id
  const [pendingOperations, setPendingOperations] = useState<PendingServiceOperation[]>([])
  const servicesQuery = useSuspenseQuery(
    createServicesQueryOptions(projectId, environmentId, pendingOperations.length > 0),
  )
  const services = servicesQuery.data
  const unresolvedOperations = pendingOperations.filter(
    (operation) => !checkServiceOperationIsVisible(operation, services),
  )
  if (unresolvedOperations.length !== pendingOperations.length) {
    setPendingOperations(unresolvedOperations)
  }
  const navigate = Route.useNavigate()
  const { q = '' } = Route.useSearch()
  return (
    <SelectionListPage
      dataError={servicesQuery.error}
      emptyMessage="No services are available."
      entities={services}
      label="Service"
      notice={undefined}
      query={q}
      selectionProgress={{
        environmentName: environment.name,
        projectId,
        projectName: project.name,
        step: 'services',
      }}
      title="Services"
      onQueryChange={(query) =>
        void navigate({ replace: true, search: query === '' ? {} : { q: query } })
      }
      renderCard={(service) => (
        <EntityCard
          actions={
            <ServiceActions
              deployment={service.deployment}
              serviceName={service.name}
              target={{ environmentId, projectId, serviceId: service.id }}
              onOperationAccepted={(operation) => {
                setPendingOperations((current) => [
                  ...current,
                  {
                    ...operation,
                    previousDeploymentId: service.deployment?.id ?? null,
                  },
                ])
              }}
            />
          }
          entity={service}
          meta={<StatusBadge status={service.deployment?.status ?? null} />}
        />
      )}
    />
  )
}
