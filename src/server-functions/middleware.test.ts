import { describe, expect, it } from 'vitest'
import { RequestOriginError, requireAppOrigin } from '@/server-functions/middleware'
import { testAppOrigin } from '@/test/fixtures'

describe('server function request origin', () => {
  it('accepts the configured origin', () => {
    const request = new Request(`${testAppOrigin}/session`, {
      headers: { origin: testAppOrigin },
    })

    expect(() => requireAppOrigin(request, testAppOrigin)).not.toThrow()
  })

  it.each([
    ['another site', 'https://attacker.test', testAppOrigin],
    ['another configured origin', testAppOrigin, 'https://configured.test'],
    ['a malformed origin', 'not an origin', testAppOrigin],
    ['a missing origin', null, testAppOrigin],
  ])('rejects %s', (_name, origin, appOrigin) => {
    const headers = new Headers()

    if (origin !== null) {
      headers.set('origin', origin)
    }

    expect(() =>
      requireAppOrigin(new Request(`${testAppOrigin}/session`, { headers }), appOrigin),
    ).toThrow(new RequestOriginError())
  })
})
