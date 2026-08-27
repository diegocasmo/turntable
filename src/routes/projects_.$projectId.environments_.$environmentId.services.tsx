import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter, useRouterState } from '@tanstack/react-router'
import { TurntablePage } from '@/components/turntable-page'
import { ServiceActions } from '@/deployment/components/service-actions'
import { StatusBadge } from '@/deployment/components/status-badge'
import { EntityCard } from '@/selection/components/entity-card-grid'
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

export const Route = createFileRoute('/projects_/$projectId/environments_/$environmentId/services')(
  {
    validateSearch: entitySearchSchema,
    loader: ({ context, params }) =>
      loadServicesRoute(context, params.projectId, params.environmentId),
    pendingComponent: SelectionRoutePending,
    errorComponent: SelectionRouteError,
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
  const projects = useSuspenseQuery(createProjectsQueryOptions()).data
  const environments = useSuspenseQuery(createEnvironmentsQueryOptions(projectId)).data
  const servicesQuery = useSuspenseQuery(createServicesQueryOptions(projectId, environmentId))
  const services = servicesQuery.data
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
