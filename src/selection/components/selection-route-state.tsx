import type { ErrorComponentProps } from '@tanstack/react-router'
import {
  EntitySelectionFailure,
  EntitySelectionPage,
  EntitySelectionSkeleton,
} from '@/selection/components/entity-selection-page'
import type { SelectionProgress } from '@/selection/components/selection-breadcrumbs'

type SelectionRouteStateProps = Readonly<{
  selectionProgress: SelectionProgress
  title: string
}>

export function SelectionRoutePending({ selectionProgress, title }: SelectionRouteStateProps) {
  return (
    <EntitySelectionPage
      feedback="Loading choices."
      selectionProgress={selectionProgress}
      title={title}
    >
      <EntitySelectionSkeleton />
    </EntitySelectionPage>
  )
}

export function SelectionRouteError({
  error,
  reset,
  selectionProgress,
  title,
}: ErrorComponentProps & SelectionRouteStateProps) {
  return (
    <EntitySelectionPage selectionProgress={selectionProgress} title={title}>
      <EntitySelectionFailure error={error} onRetry={reset} />
    </EntitySelectionPage>
  )
}
