import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouterState } from '@tanstack/react-router'
import { TurntablePage } from '@/components/turntable-page'
import { EntityCard, primaryActionClassName } from '@/selection/components/entity-card-grid'
import { SelectionListPage } from '@/selection/components/selection-list-page'
import {
  SelectionRouteError,
  SelectionRoutePending,
} from '@/selection/components/selection-route-state'
import { createProjectsQueryOptions } from '@/selection/query-options'
import { loadProjectsRoute, refreshProjectsRoute } from '@/selection/route-loaders'
import { entitySearchSchema, readSelectionNotice } from '@/selection/schema'

export const Route = createFileRoute('/projects')({
  validateSearch: entitySearchSchema,
  loader: ({ context }) => loadProjectsRoute(context),
  pendingComponent: SelectionRoutePending,
  errorComponent: SelectionRouteError,
  component: ProjectRoute,
})

function ProjectRoute() {
  const { sessionState } = Route.useRouteContext()
  return sessionState === 'authenticated' ? (
    <AuthenticatedProjectRoute />
  ) : (
    <TurntablePage sessionState={sessionState} />
  )
}

function AuthenticatedProjectRoute() {
  const { queryClient } = Route.useRouteContext()
  const projects = useSuspenseQuery(createProjectsQueryOptions()).data
  const navigate = Route.useNavigate()
  const { q = '' } = Route.useSearch()
  const notice = useRouterState({ select: (state) => readSelectionNotice(state.location.state) })

  return (
    <TurntablePage sessionState="authenticated">
      <SelectionListPage
        breadcrumbs={[
          { kind: 'current', label: 'Project' },
          { kind: 'disabled', label: 'Environment', description: 'Select a project first' },
          { kind: 'disabled', label: 'Services', description: 'Select an environment first' },
        ]}
        emptyMessage="No projects are available."
        entities={projects.map((project) => ({
          ...project,
          ...(project.workspace ? { description: project.workspace.name } : {}),
        }))}
        label="Project"
        notice={notice}
        query={q}
        title="Choose a project"
        onQueryChange={(query) =>
          void navigate({ replace: true, search: query === '' ? {} : { q: query } })
        }
        onRefresh={() => refreshProjectsRoute(queryClient)}
        renderCard={(project) => (
          <EntityCard
            entity={project}
            renderPrimaryAction={(content) => (
              <Link
                aria-label={`Select ${project.name}${project.description ? ` in ${project.description}` : ''}`}
                className={primaryActionClassName}
                params={{ projectId: project.id }}
                search={{}}
                to="/projects/$projectId/environments"
              >
                {content}
              </Link>
            )}
          />
        )}
      />
    </TurntablePage>
  )
}
