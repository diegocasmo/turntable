import { type ReactNode, useMemo } from 'react'
import { EntityCardGrid } from '@/selection/components/entity-card-grid'
import { EntitySearchInput } from '@/selection/components/entity-search-input'
import { filterEntities, type SelectionEntity } from '@/selection/filter-entities'

type EntitySearchSurfacesProps<Entity extends SelectionEntity> = Readonly<{
  emptyMessage: string
  entities: readonly Entity[]
  label: string
  onQueryChange: (query: string) => void
  query: string
  renderCard: (entity: Entity) => ReactNode
}>

export function EntitySearchSurfaces<Entity extends SelectionEntity>({
  emptyMessage,
  entities,
  label,
  onQueryChange,
  query,
  renderCard,
}: EntitySearchSurfacesProps<Entity>) {
  const filteredEntities = useMemo(() => filterEntities(entities, query), [entities, query])

  return (
    <>
      <EntitySearchInput
        label={label}
        query={query}
        resultCount={filteredEntities.length}
        onQueryChange={onQueryChange}
      />
      <EntityCardGrid
        allEntityCount={entities.length}
        emptyMessage={emptyMessage}
        entities={filteredEntities}
        query={query}
        renderCard={renderCard}
        onClearQuery={() => onQueryChange('')}
      />
    </>
  )
}
