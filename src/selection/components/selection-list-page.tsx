import { useMutation } from '@tanstack/react-query'
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
  onRefresh: () => Promise<void>
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
  onRefresh,
  query,
  renderCard,
  selectionProgress,
  title,
}: SelectionListPageProps<Entity>) {
  const refresh = useMutation({ mutationFn: onRefresh })
  let feedback = notice
  if (refresh.isSuccess) feedback = `${label}s refreshed.`
  if (dataError) feedback = dataError.message
  if (refresh.error) feedback = refresh.error.message

  return (
    <EntitySelectionPage
      feedbackKind={refresh.error || dataError ? 'alert' : 'status'}
      refreshLabel={`${label}s`}
      refreshPending={refresh.isPending}
      selectionProgress={selectionProgress}
      title={title}
      onRefresh={() => {
        if (!refresh.isPending) refresh.mutate()
      }}
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
