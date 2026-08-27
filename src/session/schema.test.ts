import { describe, expect, it } from 'vitest'
import { connectSearchSchema } from '@/session/schema'

describe('connect search', () => {
  it('keeps a protected Turntable destination', () => {
    expect(
      connectSearchSchema.parse({
        redirect: '/projects/project-1/environments?q=local',
      }),
    ).toEqual({ redirect: '/projects/project-1/environments?q=local' })
  })

  it.each([
    ['a missing destination', undefined],
    ['an external destination', 'https://example.com'],
    ['a protocol-relative destination', '//example.com'],
    ['the public connection route', '/connect'],
  ])('uses Projects for %s', (_name, redirect) => {
    expect(connectSearchSchema.parse({ redirect })).toEqual({ redirect: '/projects' })
  })
})
