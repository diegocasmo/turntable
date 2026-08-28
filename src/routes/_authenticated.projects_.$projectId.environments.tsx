import { useSuspenseQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  type ErrorComponentProps,
  Link,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { EntityCard, primaryActionClassName } from '@/selection/components/entity-card-grid'
import type { SelectionProgress } from '@/selection/components/selection-breadcrumbs'
import { SelectionListPage } from '@/selection/components/selection-list-page'
import {
  SelectionRouteError,
  SelectionRoutePending,
} from '@/selection/components/selection-route-state'
import { createEnvironmentsQueryOptions } from '@/selection/queries'
import { loadEnvironmentsRoute, refreshEnvironmentsRoute } from '@/selection/route-loaders'
import { entitySearchSchema, readSelectionNotice } from '@/selection/schema'

const environmentRouteStateProgress: SelectionProgress = { step: 'environment' }

function EnvironmentRoutePending() {
  return (
    <SelectionRoutePending
      selectionProgress={environmentRouteStateProgress}
      title="Loading environments"
    />
  )
}

function EnvironmentRouteError(props: ErrorComponentProps) {
  return (
    <SelectionRouteError
      {...props}
      selectionProgress={environmentRouteStateProgress}
      title="Could not load environments"
    />
  )
}

export const Route = createFileRoute('/_authenticated/projects_/$projectId/environments')({
  validateSearch: entitySearchSchema,
  loader: ({ context, params }) => loadEnvironmentsRoute(context, params.projectId),
  pendingComponent: EnvironmentRoutePending,
  errorComponent: EnvironmentRouteError,
  component: EnvironmentRoute,
})

function EnvironmentRoute() {
  const { queryClient } = Route.useRouteContext()
  const { projectId } = Route.useParams()
  const { project } = Route.useLoaderData()
  const environments = useSuspenseQuery(createEnvironmentsQueryOptions(projectId)).data
  const navigate = Route.useNavigate()
  const router = useRouter()
  const { q = '' } = Route.useSearch()
  const notice = useRouterState({ select: (state) => readSelectionNotice(state.location.state) })
  return (
    <SelectionListPage
      emptyMessage="No environments are available."
      entities={environments}
      label="Environment"
      notice={notice}
      query={q}
      selectionProgress={{ projectName: project.name, step: 'environment' }}
      title="Choose an environment"
      onQueryChange={(query) =>
        void navigate({ replace: true, search: query === '' ? {} : { q: query } })
      }
      onRefresh={async () => {
        const validity = await refreshEnvironmentsRoute(queryClient, projectId)
        const routeIsCurrent = router.matchRoute(
          { params: { projectId }, to: '/projects/$projectId/environments' },
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
      }}
      renderCard={(environment) => (
        <EntityCard
          entity={environment}
          renderPrimaryAction={(content) => (
            <Link
              aria-label={`Select ${environment.name}`}
              className={primaryActionClassName}
              params={{ environmentId: environment.id, projectId }}
              search={{}}
              to="/projects/$projectId/environments/$environmentId/services"
            >
              {content}
            </Link>
          )}
        />
      )}
    />
  )
}
