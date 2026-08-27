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
  const normalizedQuery = query.trim()

  if (normalizedQuery === '') {
    return [...entities]
  }

  return fuzzysort.go(normalizedQuery, entities, { key: 'name' }).map((result) => result.obj)
}
