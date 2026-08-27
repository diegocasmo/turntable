import type { ErrorComponentProps } from '@tanstack/react-router'
import {
  EntitySelectionFailure,
  EntitySelectionPage,
  EntitySelectionSkeleton,
} from '@/selection/components/entity-selection-page'
import type { SelectionBreadcrumbStep } from '@/selection/components/selection-breadcrumbs'

type SelectionRouteStateProps = Readonly<{
  breadcrumbs: readonly SelectionBreadcrumbStep[]
  title: string
}>

export function SelectionRoutePending({ breadcrumbs, title }: SelectionRouteStateProps) {
  return (
    <EntitySelectionPage breadcrumbs={breadcrumbs} feedback="Loading choices." title={title}>
      <EntitySelectionSkeleton />
    </EntitySelectionPage>
  )
}

export function SelectionRouteError({
  breadcrumbs,
  error,
  reset,
  title,
}: ErrorComponentProps & SelectionRouteStateProps) {
  return (
    <EntitySelectionPage breadcrumbs={breadcrumbs} title={title}>
      <EntitySelectionFailure error={error} onRetry={reset} />
    </EntitySelectionPage>
  )
}
