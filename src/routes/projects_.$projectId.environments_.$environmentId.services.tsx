import { useSuspenseQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  type ErrorComponentProps,
  Link,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { useState } from 'react'
import { TurntablePage } from '@/components/turntable-page'
import {
  type AcceptedServiceOperation,
  ServiceActions,
} from '@/deployment/components/service-actions'
import { StatusBadge } from '@/deployment/components/status-badge'
import { EntityCard } from '@/selection/components/entity-card-grid'
import type { SelectionBreadcrumbStep } from '@/selection/components/selection-breadcrumbs'
import { SelectionListPage } from '@/selection/components/selection-list-page'
import {
  SelectionRouteError,
  SelectionRoutePending,
} from '@/selection/components/selection-route-state'
import {
  createEnvironmentsQueryOptions,
  createProjectsQueryOptions,
  createServicesQueryOptions,
} from '@/selection/query-options'
import { loadServicesRoute, refreshServicesRoute } from '@/selection/route-loaders'
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
  const service = services.find((candidate) => candidate.id === operation.serviceId)
  if (!service) return true

  const deploymentId = service.deployment?.id ?? null
  return operation.action === 'spin-down'
    ? deploymentId !== operation.deploymentId
    : deploymentId === operation.deploymentId || deploymentId !== operation.previousDeploymentId
}

function readServiceRouteStateBreadcrumbs(projectId: string): readonly SelectionBreadcrumbStep[] {
  return [
    {
      kind: 'link',
      label: 'Project',
      link: (
        <Link activeOptions={{ exact: true }} activeProps={{}} search={{}} to="/projects">
          Project
        </Link>
      ),
    },
    {
      kind: 'link',
      label: 'Environment',
      link: (
        <Link
          activeOptions={{ exact: true }}
          activeProps={{}}
          params={{ projectId }}
          search={{}}
          to="/projects/$projectId/environments"
        >
          Environment
        </Link>
      ),
    },
    { kind: 'current', label: 'Services' },
  ]
}

function ServiceRoutePending() {
  const { projectId } = Route.useParams()
  return (
    <SelectionRoutePending
      breadcrumbs={readServiceRouteStateBreadcrumbs(projectId)}
      title="Loading services"
    />
  )
}

function ServiceRouteError(props: ErrorComponentProps) {
  const { projectId } = Route.useParams()
  return (
    <SelectionRouteError
      {...props}
      breadcrumbs={readServiceRouteStateBreadcrumbs(projectId)}
      title="Could not load services"
    />
  )
}

export const Route = createFileRoute('/projects_/$projectId/environments_/$environmentId/services')(
  {
    validateSearch: entitySearchSchema,
    loader: ({ context, params }) =>
      loadServicesRoute(context, params.projectId, params.environmentId),
    pendingComponent: ServiceRoutePending,
    errorComponent: ServiceRouteError,
    component: ServiceRoute,
  },
)

function ServiceRoute() {
  const { sessionState } = Route.useRouteContext()
  return sessionState === 'authenticated' ? (
    <AuthenticatedServiceRoute />
  ) : (
    <TurntablePage sessionState={sessionState} />
  )
}

function AuthenticatedServiceRoute() {
  const { queryClient } = Route.useRouteContext()
  const { environmentId, projectId } = Route.useParams()
  const [pendingOperations, setPendingOperations] = useState<PendingServiceOperation[]>([])
  const projects = useSuspenseQuery(createProjectsQueryOptions()).data
  const environments = useSuspenseQuery(createEnvironmentsQueryOptions(projectId)).data
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
  const router = useRouter()
  const { q = '' } = Route.useSearch()
  const notice = useRouterState({ select: (state) => readSelectionNotice(state.location.state) })
  const projectName = projects.find((project) => project.id === projectId)?.name ?? projectId
  const environmentName =
    environments.find((environment) => environment.id === environmentId)?.name ?? environmentId

  return (
    <TurntablePage sessionState="authenticated">
      <SelectionListPage
        breadcrumbs={[
          {
            kind: 'link',
            label: `Project: ${projectName}`,
            link: (
              <Link activeOptions={{ exact: true }} activeProps={{}} search={{}} to="/projects">
                Project: {projectName}
              </Link>
            ),
          },
          {
            kind: 'link',
            label: `Environment: ${environmentName}`,
            link: (
              <Link
                activeOptions={{ exact: true }}
                activeProps={{}}
                params={{ projectId }}
                search={{}}
                to="/projects/$projectId/environments"
              >
                Environment: {environmentName}
              </Link>
            ),
          },
          { kind: 'current', label: 'Services' },
        ]}
        emptyMessage="No services are available."
        entities={services}
        dataError={servicesQuery.error}
        label="Service"
        notice={notice}
        query={q}
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
        title="Services"
        onQueryChange={(query) =>
          void navigate({ replace: true, search: query === '' ? {} : { q: query } })
        }
        onRefresh={async () => {
          const validity = await refreshServicesRoute(queryClient, projectId, environmentId)
          const routeIsCurrent = router.matchRoute(
            {
              params: { environmentId, projectId },
              to: '/projects/$projectId/environments/$environmentId/services',
            },
            { pending: false },
          )
          if (routeIsCurrent && validity === 'project-missing') {
            await navigate({
              replace: true,
              search: {},
              state: (state) => ({
                ...state,
                selectionNotice: 'The selected project is no longer available.',
              }),
              to: '/projects',
            })
          }
          if (routeIsCurrent && validity === 'environment-missing') {
            await navigate({
              params: { projectId },
              replace: true,
              search: {},
              state: (state) => ({
                ...state,
                selectionNotice: 'The selected environment is no longer available.',
              }),
              to: '/projects/$projectId/environments',
            })
          }
        }}
      />
    </TurntablePage>
  )
}
