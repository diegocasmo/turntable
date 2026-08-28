import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, type ErrorComponentProps, useRouterState } from '@tanstack/react-router'
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
import { createServicesQueryOptions } from '@/selection/queries'
import { loadServicesRoute } from '@/selection/route-loaders'
import { entitySearchSchema, readSelectionNotice } from '@/selection/schema'

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

function ServiceRoutePending() {
  const { projectId } = Route.useParams()
  return (
    <SelectionRoutePending
      selectionProgress={{ projectId, step: 'services' }}
      title="Loading services"
    />
  )
}

function ServiceRouteError(props: ErrorComponentProps) {
  const { projectId } = Route.useParams()
  return (
    <SelectionRouteError
      {...props}
      selectionProgress={{ projectId, step: 'services' }}
      title="Could not load services"
    />
  )
}

export const Route = createFileRoute(
  '/_authenticated/projects_/$projectId/environments_/$environmentId/services',
)({
  validateSearch: entitySearchSchema,
  loader: ({ context, params }) =>
    loadServicesRoute(context, params.projectId, params.environmentId),
  pendingComponent: ServiceRoutePending,
  errorComponent: ServiceRouteError,
  component: ServiceRoute,
})

function ServiceRoute() {
  const { environment, project } = Route.useLoaderData()
  const { environmentId, projectId } = Route.useParams()
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
  const notice = useRouterState({ select: (state) => readSelectionNotice(state.location.state) })
  return (
    <SelectionListPage
      dataError={servicesQuery.error}
      emptyMessage="No services are available."
      entities={services}
      label="Service"
      notice={notice}
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
