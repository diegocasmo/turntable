import fuzzysort from 'fuzzysort'

export type SelectionEntity = Readonly<{
  description?: string
  id: string
  name: string
}>

export function filterEntities<Entity extends SelectionEntity>(
  entities: readonly Entity[],
  query: string,
) {
  const trimmedQuery = query.trim()

  if (trimmedQuery === '') {
    return entities
  }

  return fuzzysort.go(trimmedQuery, entities, { key: 'name' }).map((result) => result.obj)
}
