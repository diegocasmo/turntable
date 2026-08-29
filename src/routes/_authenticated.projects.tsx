import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, type ErrorComponentProps, Link } from '@tanstack/react-router'
import { EntityCard, primaryActionClassName } from '@/selection/components/entity-card-grid'
import type { SelectionProgress } from '@/selection/components/selection-breadcrumbs'
import { SelectionListPage } from '@/selection/components/selection-list-page'
import {
  SelectionRouteError,
  SelectionRoutePending,
} from '@/selection/components/selection-route-state'
import { createProjectsQueryOptions } from '@/selection/queries'
import { loadProjectsRoute } from '@/selection/route-loaders'
import { entitySearchSchema } from '@/selection/schema'
import { useClearSelectionNotice } from '@/selection/use-clear-selection-notice'

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
  const projects = useSuspenseQuery(createProjectsQueryOptions()).data
  const navigate = Route.useNavigate()
  const { notice, q = '' } = Route.useSearch()
  const clearSelectionNotice = useClearSelectionNotice(notice, q)

  return (
    <SelectionListPage
      emptyMessage="No projects are available."
      entities={projects.map((project) => ({
        ...project,
        ...(project.workspace ? { description: project.workspace.name } : {}),
      }))}
      label="Project"
      notice={
        notice
          ? {
              message: 'Choose another project to continue.',
              title: 'Project unavailable',
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
      selectionProgress={projectSelectionProgress}
      title="Choose a project"
      onQueryChange={(query) =>
        void navigate({
          replace: true,
          search: {
            ...(notice ? { notice } : {}),
            ...(query === '' ? {} : { q: query }),
          },
        })
      }
      renderCard={(project) => (
        <EntityCard
          entity={project}
          renderPrimaryAction={(content) => (
            <Link
              aria-label={`Select ${project.name}${project.description ? ` in ${project.description}` : ''}`}
              className={primaryActionClassName}
              viewTransition
              params={{ projectId: project.id }}
              search={{}}
              to="/projects/$projectId/environments"
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
