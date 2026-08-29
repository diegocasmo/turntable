import { isRedirect } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { RailwayGraphQLError, RailwayHttpError, RailwayRateLimitError } from '@/railway/errors'
import { writeSession } from '@/session/cookie.server'
import { readSessionState } from '@/session/read-state.server'
import { readWithRailwaySession } from '@/session/read-with-railway-session.server'
import type { SessionNotice } from '@/session/schema'
import { testSessionSecret } from '@/test/fixtures'
import { testRailwayToken } from '@/test/railway'
import { readFirstCookie, runServerRequest } from '@/test/start-request'

async function createSessionCookie() {
  const created = await runServerRequest(() => writeSession(testRailwayToken, testSessionSecret))
  return readFirstCookie(created.response)
}

function expectConnectRedirect(error: unknown, notice: SessionNotice) {
  expect(isRedirect(error)).toBe(true)

  if (!isRedirect(error)) {
    throw new Error('Expected a connect redirect.')
  }

  expect(error.options).toMatchObject({
    reloadDocument: true,
    search: { notice, redirect: '/projects' },
    to: '/connect',
  })
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
    expectConnectRedirect(result.error, 'expired')
    const state = await runServerRequest(() => readSessionState(testSessionSecret, true), {
      cookie: readFirstCookie(response),
    })
    expect(state.result).toEqual({ ok: true, value: 'expired' })
  })

  it.each([
    ['GraphQL Not Authorized', new RailwayGraphQLError(['Not Authorized'])],
    ['HTTP 401', new RailwayHttpError(401)],
  ])('redirects with a rejection marker after Railway returns %s', async (_name, error) => {
    const cookie = await createSessionCookie()
    const { response, result } = await runServerRequest(
      () => readWithRailwaySession(testSessionSecret, () => Promise.reject(error)),
      { cookie },
    )

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected the Railway read to fail.')
    }
    expectConnectRedirect(result.error, 'token-rejected')
    const state = await runServerRequest(() => readSessionState(testSessionSecret, true), {
      cookie: readFirstCookie(response),
    })
    expect(state.result).toEqual({ ok: true, value: 'token-rejected' })
  })

  it.each([
    ['another GraphQL error', new RailwayGraphQLError(['Deployment not found'])],
    ['a rate limit', new RailwayRateLimitError()],
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
