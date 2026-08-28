import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { SelectionEntity } from '@/selection/filter-entities'

type EntityCardGridProps<Entity extends SelectionEntity> = Readonly<{
  allEntityCount: number
  entities: readonly Entity[]
  emptyMessage: string
  query: string
  renderCard: (entity: Entity) => ReactNode
}>

type EntityCardProps<Entity extends SelectionEntity> = Readonly<{
  actions?: ReactNode
  entity: Entity
  meta?: ReactNode
  renderPrimaryAction?: (content: ReactNode) => ReactNode
}>

const primaryActionClassName =
  'block min-h-24 min-w-0 cursor-pointer px-5 py-4 text-left outline-none focus-visible:outline-[3px] focus-visible:outline-offset-[-4px] focus-visible:outline-focus'

export function EntityCard<Entity extends SelectionEntity>({
  actions,
  entity,
  meta,
  renderPrimaryAction,
}: EntityCardProps<Entity>) {
  const content = (
    <>
      <span className="block break-words font-semibold text-text">{entity.name}</span>
      {entity.description ? (
        <span className="mt-2 block break-words font-label text-xs text-text-soft">
          {entity.description}
        </span>
      ) : null}
      {meta ? <span className="mt-3 block">{meta}</span> : null}
    </>
  )

  return (
    <article
      aria-label={entity.name}
      className={cn(
        'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] rounded-panel border border-border bg-panel shadow-[3px_3px_0_var(--color-shadow)]',
        renderPrimaryAction &&
          'transition-[border-color,box-shadow,transform] focus-within:border-accent hover:border-text-soft active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_var(--color-shadow)]',
      )}
    >
      {renderPrimaryAction ? (
        renderPrimaryAction(content)
      ) : (
        <div className="min-h-24 min-w-0 px-5 py-4">{content}</div>
      )}
      {actions ? <div className="col-span-full min-w-0">{actions}</div> : null}
    </article>
  )
}

export { primaryActionClassName }

export function EntityCardGrid<Entity extends SelectionEntity>({
  allEntityCount,
  emptyMessage,
  entities,
  query,
  renderCard,
}: EntityCardGridProps<Entity>) {
  if (entities.length === 0) {
    const hasNoMatches = allEntityCount > 0 && query.trim() !== ''

    return (
      <p role="status" className="text-sm text-text-soft">
        {hasNoMatches ? `No results for “${query.trim()}”.` : emptyMessage}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {entities.map((entity) => (
        <div key={entity.id}>{renderCard(entity)}</div>
      ))}
    </div>
  )
}
