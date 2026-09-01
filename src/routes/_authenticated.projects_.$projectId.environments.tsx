import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, type ErrorComponentProps, Link } from '@tanstack/react-router'
import { EntityCard, primaryActionClassName } from '@/selection/components/entity-card-grid'
import type { SelectionProgress } from '@/selection/components/selection-breadcrumbs'
import { SelectionListPage } from '@/selection/components/selection-list-page'
import {
  SelectionRouteError,
  SelectionRoutePending,
} from '@/selection/components/selection-route-state'
import { createEnvironmentsQueryOptions } from '@/selection/queries'
import { loadEnvironmentsRoute } from '@/selection/route-loaders'
import { entitySearchSchema } from '@/selection/schema'
import { useClearSelectionNotice } from '@/selection/use-clear-selection-notice'

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
  const { projectId } = Route.useParams()
  const { project } = Route.useLoaderData()
  const environments = useSuspenseQuery(createEnvironmentsQueryOptions(projectId)).data
  const navigate = Route.useNavigate()
  const { notice, q = '' } = Route.useSearch()
  const clearSelectionNotice = useClearSelectionNotice(notice, q)
  return (
    <SelectionListPage
      emptyMessage="No environments are available."
      entities={environments}
      label="Environment"
      notice={
        notice
          ? {
              message: 'Choose another environment to continue.',
              title: 'Environment unavailable',
              onDismiss: () =>
                navigate({
                  replace: true,
                  search: q === '' ? {} : { q },
                  viewTransition: true,
                }),
            }
          : undefined
      }
      query={q}
      selectionProgress={{ projectName: project.name, step: 'environment' }}
      title="Choose an environment"
      onQueryChange={(query) =>
        void navigate({
          replace: true,
          search: {
            ...(notice ? { notice } : {}),
            ...(query === '' ? {} : { q: query }),
          },
        })
      }
      renderCard={(environment) => (
        <EntityCard
          entity={environment}
          renderPrimaryAction={(content) => (
            <Link
              aria-label={`Select ${environment.name}`}
              className={primaryActionClassName}
              viewTransition
              params={{ environmentId: environment.id }}
              search={{}}
              to="/environments/$environmentId/services"
              onClick={clearSelectionNotice}
            >
              {content}
            </Link>
          )}
        />
      )}
    />
  )
}
