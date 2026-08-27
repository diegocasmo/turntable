import type { ErrorComponentProps } from '@tanstack/react-router'
import {
  EntitySelectionFailure,
  EntitySelectionPage,
  EntitySelectionSkeleton,
} from '@/selection/components/entity-selection-page'

const loadingBreadcrumbs = [{ kind: 'current', label: 'Selection' }] as const

export function SelectionRoutePending() {
  return (
    <EntitySelectionPage
      breadcrumbs={loadingBreadcrumbs}
      feedback="Loading choices."
      title="Loading selection"
    >
      <EntitySelectionSkeleton />
    </EntitySelectionPage>
  )
}

export function SelectionRouteError({ error, reset }: ErrorComponentProps) {
  return (
    <EntitySelectionPage breadcrumbs={loadingBreadcrumbs} title="Could not load selection">
      <EntitySelectionFailure error={error} onRetry={reset} />
    </EntitySelectionPage>
  )
}
