import type { ErrorComponentProps } from '@tanstack/react-router'
import { TurntablePage } from '@/components/turntable-page'
import {
  EntitySelectionFailure,
  EntitySelectionPage,
  EntitySelectionSkeleton,
} from '@/selection/components/entity-selection-page'
import { SelectionHomeLink } from '@/selection/components/selection-breadcrumbs'

const loadingBreadcrumbs = [
  {
    kind: 'link',
    label: 'Home',
    link: <SelectionHomeLink />,
  },
  { kind: 'current', label: 'Selection' },
] as const

export function SelectionRoutePending() {
  return (
    <TurntablePage sessionState="authenticated">
      <EntitySelectionPage
        breadcrumbs={loadingBreadcrumbs}
        feedback="Loading choices."
        title="Loading selection"
      >
        <EntitySelectionSkeleton />
      </EntitySelectionPage>
    </TurntablePage>
  )
}

export function SelectionRouteError({ error, reset }: ErrorComponentProps) {
  return (
    <TurntablePage sessionState="authenticated">
      <EntitySelectionPage breadcrumbs={loadingBreadcrumbs} title="Could not load selection">
        <EntitySelectionFailure error={error} onRetry={reset} />
      </EntitySelectionPage>
    </TurntablePage>
  )
}
