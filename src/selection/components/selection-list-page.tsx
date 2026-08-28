import type { ReactNode } from 'react'
import { EntitySearchSurfaces } from '@/selection/components/entity-search-surfaces'
import { EntitySelectionPage } from '@/selection/components/entity-selection-page'
import type { SelectionProgress } from '@/selection/components/selection-breadcrumbs'
import type { SelectionEntity } from '@/selection/filter-entities'

type SelectionListPageProps<Entity extends SelectionEntity> = Readonly<{
  dataError?: Error | null
  emptyMessage: string
  entities: readonly Entity[]
  label: string
  notice: string | undefined
  onQueryChange: (query: string) => void
  query: string
  renderCard: (entity: Entity) => ReactNode
  selectionProgress: SelectionProgress
  title: string
}>

export function SelectionListPage<Entity extends SelectionEntity>({
  dataError,
  emptyMessage,
  entities,
  label,
  notice,
  onQueryChange,
  query,
  renderCard,
  selectionProgress,
  title,
}: SelectionListPageProps<Entity>) {
  let feedback = notice
  if (dataError) feedback = dataError.message

  return (
    <EntitySelectionPage
      feedbackKind={dataError ? 'alert' : 'status'}
      selectionProgress={selectionProgress}
      title={title}
      {...(feedback ? { feedback } : {})}
    >
      <EntitySearchSurfaces
        emptyMessage={emptyMessage}
        entities={entities}
        label={label}
        query={query}
        renderCard={renderCard}
        onQueryChange={onQueryChange}
      />
    </EntitySelectionPage>
  )
}
