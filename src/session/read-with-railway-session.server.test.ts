import { isRedirect } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
import { sessionCookieName, writeSession } from '@/session/cookie.server'
import { readWithRailwaySession } from '@/session/read-with-railway-session.server'
import { testSessionSecret } from '@/test/fixtures'
import { testRailwayToken } from '@/test/railway'
import { readFirstCookie, runServerRequest } from '@/test/start-request'

const clearedSessionCookie = `${sessionCookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`

async function createSessionCookie() {
  const created = await runServerRequest(() => writeSession(testRailwayToken, testSessionSecret))
  return readFirstCookie(created.response)
}

function expectConnectRedirect(error: unknown) {
  expect(isRedirect(error)).toBe(true)

  if (!isRedirect(error)) {
    throw new Error('Expected a connect redirect.')
  }

  expect(error.options).toMatchObject({ reloadDocument: true, search: true, to: '/' })
}

describe('read with Railway session', () => {
  it('returns a successful value from the stored token', async () => {
    const cookie = await createSessionCookie()
    const { result } = await runServerRequest(
      () => readWithRailwaySession(testSessionSecret, async (token) => token.length),
      { cookie },
    )

    expect(result).toEqual({ ok: true, value: testRailwayToken.length })
  })

  it('redirects and clears an invalid local session', async () => {
    const { response, result } = await runServerRequest(() =>
      readWithRailwaySession(testSessionSecret, async () => 'unused'),
    )

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected the session read to fail.')
    }
    expectConnectRedirect(result.error)
    expect(response.headers.get('set-cookie')).toBe(clearedSessionCookie)
  })

  it('redirects and clears the session after Railway rejects the stored token', async () => {
    const cookie = await createSessionCookie()
    const { response, result } = await runServerRequest(
      () =>
        readWithRailwaySession(testSessionSecret, () =>
          Promise.reject(new RailwayGraphQLError(['Not Authorized'])),
        ),
      { cookie },
    )

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected the Railway read to fail.')
    }
    expectConnectRedirect(result.error)
    expect(response.headers.get('set-cookie')).toBe(clearedSessionCookie)
  })

  it.each([
    ['another GraphQL error', new RailwayGraphQLError(['Deployment not found'])],
    ['a rate limit', new RailwayRateLimitError(30)],
  ])('keeps %s on the normal error path', async (_name, railwayError) => {
    const cookie = await createSessionCookie()
    const { response, result } = await runServerRequest(
      () => readWithRailwaySession(testSessionSecret, () => Promise.reject(railwayError)),
      { cookie },
    )

    expect(result).toEqual({
      error: expect.objectContaining({ message: railwayError.message }),
      ok: false,
    })
    expect(response.headers.getSetCookie()).toEqual([])
  })
})
