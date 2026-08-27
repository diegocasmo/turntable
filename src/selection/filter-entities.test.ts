import { describe, expect, it } from 'vitest'
import { filterEntities } from '@/selection/filter-entities'

const entities = [
  { id: 'web', name: 'Web' },
  { id: 'api-worker', name: 'API worker' },
  { id: 'worker', name: 'Worker' },
]

describe('filterEntities', () => {
  it('keeps source order when the query is blank', () => {
    expect(filterEntities(entities, '  ')).toEqual(entities)
  })

  it('ranks typo-tolerant name matches without matching descriptions', () => {
    const describedEntities = entities.map((entity) => ({ ...entity, description: 'zulu' }))

    expect(filterEntities(describedEntities, 'WKR').map((entity) => entity.id)).toEqual([
      'worker',
      'api-worker',
    ])
    expect(filterEntities(describedEntities, 'zulu')).toEqual([])
  })
})
