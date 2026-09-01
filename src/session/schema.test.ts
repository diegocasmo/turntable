import { describe, expect, it } from 'vitest'
import { connectSearchSchema } from '@/session/schema'

describe('connect search', () => {
  it.each([
    '/projects/project-1/environments?q=local',
    '/environments/environment-1/services?q=worker',
  ])('keeps the protected Turntable destination %s', (redirect) => {
    expect(
      connectSearchSchema.parse({
        redirect,
      }),
    ).toEqual({ redirect })
  })

  it.each([
    ['a missing destination', undefined],
    ['an external destination', 'https://example.com'],
    ['a protocol-relative destination', '//example.com'],
    ['a fragment destination', '/projects#services'],
    ['the public connection route', '/connect'],
  ])('uses Projects for %s', (_name, redirect) => {
    expect(connectSearchSchema.parse({ redirect })).toEqual({ redirect: '/projects' })
  })
})
