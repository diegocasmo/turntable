import fuzzysort from 'fuzzysort'
import { describe, expect, it } from 'vitest'

describe('fuzzysort compatibility', () => {
  it('ranks picker labels and normalizes accents', () => {
    const results = fuzzysort.go('prod', ['Product analytics', 'Preview', 'Production'])

    expect(results.map((result) => result.target)).toEqual(['Production', 'Product analytics'])
    expect(fuzzysort.single('resume', 'Résumé')).not.toBeNull()
  })
})
