import { type ReactNode, useRef } from 'react'
import { EntitySearchSurfaces } from '@/selection/components/entity-search-surfaces'
import { EntitySelectionPage } from '@/selection/components/entity-selection-page'
import type { SelectionProgress } from '@/selection/components/selection-breadcrumbs'
import type { SelectionEntity } from '@/selection/filter-entities'

type SelectionListPageProps<Entity extends SelectionEntity> = Readonly<{
  dataError?: Error | null
  emptyMessage: string
  entities: readonly Entity[]
  label: string
  notice:
    | Readonly<{
        message: string
        onDismiss: () => Promise<void>
        title: string
      }>
    | undefined
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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const visibleNotice = dataError ? undefined : notice

  async function handleNoticeDismiss() {
    await visibleNotice?.onDismiss()
    searchInputRef.current?.focus({ preventScroll: true })
  }

  return (
    <EntitySelectionPage
      feedbackKind={dataError ? 'alert' : 'status'}
      selectionProgress={selectionProgress}
      title={title}
      {...(dataError ? { feedback: dataError.message } : {})}
      {...(visibleNotice
        ? {
            notice: {
              message: visibleNotice.message,
              onDismiss: () => void handleNoticeDismiss(),
              title: visibleNotice.title,
            },
          }
        : {})}
    >
      <EntitySearchSurfaces
        emptyMessage={emptyMessage}
        entities={entities}
        inputRef={searchInputRef}
        label={label}
        query={query}
        renderCard={renderCard}
        onQueryChange={onQueryChange}
      />
    </EntitySelectionPage>
  )
}
