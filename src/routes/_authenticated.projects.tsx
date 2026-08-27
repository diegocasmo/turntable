import { useSuspenseQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  type ErrorComponentProps,
  Link,
  useRouterState,
} from '@tanstack/react-router'
import { EntityCard, primaryActionClassName } from '@/selection/components/entity-card-grid'
import type { SelectionProgress } from '@/selection/components/selection-breadcrumbs'
import { SelectionListPage } from '@/selection/components/selection-list-page'
import {
  SelectionRouteError,
  SelectionRoutePending,
} from '@/selection/components/selection-route-state'
import { createProjectsQueryOptions } from '@/selection/queries'
import { loadProjectsRoute, refreshProjectsRoute } from '@/selection/route-loaders'
import { entitySearchSchema, readSelectionNotice } from '@/selection/schema'

const projectSelectionProgress: SelectionProgress = { step: 'project' }

function ProjectRoutePending() {
  return (
    <SelectionRoutePending selectionProgress={projectSelectionProgress} title="Loading projects" />
  )
}

function ProjectRouteError(props: ErrorComponentProps) {
  return (
    <SelectionRouteError
      {...props}
      selectionProgress={projectSelectionProgress}
      title="Could not load projects"
    />
  )
}

export const Route = createFileRoute('/_authenticated/projects')({
  validateSearch: entitySearchSchema,
  loader: ({ context }) => loadProjectsRoute(context),
  pendingComponent: ProjectRoutePending,
  errorComponent: ProjectRouteError,
  component: ProjectRoute,
})

function ProjectRoute() {
  const { queryClient } = Route.useRouteContext()
  const projects = useSuspenseQuery(createProjectsQueryOptions()).data
  const navigate = Route.useNavigate()
  const { q = '' } = Route.useSearch()
  const notice = useRouterState({ select: (state) => readSelectionNotice(state.location.state) })

  return (
    <SelectionListPage
      emptyMessage="No projects are available."
      entities={projects.map((project) => ({
        ...project,
        ...(project.workspace ? { description: project.workspace.name } : {}),
      }))}
      label="Project"
      notice={notice}
      query={q}
      selectionProgress={projectSelectionProgress}
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
  )
}
