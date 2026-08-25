import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  connectRailwaySession,
  disconnectRailwaySession,
  readSessionState,
  requireAppOrigin,
  SessionActionError,
  sessionCookieName,
  sessionLifetimeSeconds,
  writeSession,
} from '@/session.server'
import {
  testAppOrigin,
  testRailwayApiUrl,
  testRailwayEnvironmentId,
  testRailwayProjectId,
  testRailwayToken,
  testSessionSecret,
} from '@/test/fixtures'
import { readFirstCookie, runServerRequest } from '@/test/start'

const currentDate = new Date('2027-01-15T12:00:00.000Z')
const sessionConfig = {
  railwayApiUrl: testRailwayApiUrl,
  sessionSecret: testSessionSecret,
}
const validRailwayBody = {
  data: {
    projects: {
      edges: [
        {
          node: {
            id: testRailwayProjectId,
            name: 'Turntable',
            primaryEnvironmentId: testRailwayEnvironmentId,
            workspace: { id: 'workspace-1', name: 'Workspace' },
          },
        },
      ],
    },
  },
}

function createJsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status })
}

async function createSessionCookie() {
  const created = await runServerRequest(() => writeSession(testRailwayToken, testSessionSecret))
  return readFirstCookie(created.response)
}

describe('session actions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(currentDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('verifies a token and stores only its encrypted session', async () => {
    const fetchRequest = vi.fn(async (_request: Request) => createJsonResponse(validRailwayBody))
    const { response, result } = await runServerRequest(() =>
      connectRailwaySession(testRailwayToken, sessionConfig, fetchRequest),
    )

    expect(result).toEqual({ ok: true, value: undefined })
    expect(response.headers.get('set-cookie')).toMatch(new RegExp(`^${sessionCookieName}=[^;]+;`))
    expect(response.headers.toString()).not.toContain(testRailwayToken)

    const railwayRequest = fetchRequest.mock.calls[0]?.[0]

    expect(railwayRequest?.headers.get('authorization')).toBe(`Bearer ${testRailwayToken}`)
    await expect(railwayRequest?.json()).resolves.toEqual({
      query: expect.stringContaining('query Projects'),
      variables: {},
    })
  })

  it('redacts the token from a Railway error', async () => {
    const fetchRequest = vi.fn(async () =>
      createJsonResponse({ errors: [{ message: `Not Authorized: ${testRailwayToken}` }] }),
    )
    const { result } = await runServerRequest(() =>
      connectRailwaySession(testRailwayToken, sessionConfig, fetchRequest),
    )

    expect(result).toEqual({
      error: new SessionActionError('Not Authorized: [REDACTED]'),
      ok: false,
    })
  })

  it('hides an invalid Railway response', async () => {
    const fetchRequest = vi.fn(async () =>
      createJsonResponse({ message: 'Problem processing request' }),
    )
    const { result } = await runServerRequest(() =>
      connectRailwaySession(testRailwayToken, sessionConfig, fetchRequest),
    )

    expect(result).toEqual({
      error: new SessionActionError('Railway could not verify this token.'),
      ok: false,
    })
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
    ).toThrow(new SessionActionError('The request origin is not allowed.'))
  })

  it('reads signed-out, authenticated, and expired session states', async () => {
    const signedOut = await runServerRequest(() => readSessionState(testSessionSecret, false))
    const cookie = await createSessionCookie()
    const authenticated = await runServerRequest(() => readSessionState(testSessionSecret, true), {
      cookie,
    })

    vi.advanceTimersByTime(sessionLifetimeSeconds * 1_000)
    const expired = await runServerRequest(() => readSessionState(testSessionSecret, true), {
      cookie,
    })

    expect(signedOut.result).toEqual({ ok: true, value: 'signed-out' })
    expect(authenticated.result).toEqual({ ok: true, value: 'authenticated' })
    expect(expired.result).toEqual({ ok: true, value: 'expired' })
    expect(expired.response.headers.get('set-cookie')).toContain(
      `${sessionCookieName}=; Max-Age=0;`,
    )
  })

  it('clears a valid session on logout', async () => {
    const cookie = await createSessionCookie()
    const { response, result } = await runServerRequest(
      () => disconnectRailwaySession(testSessionSecret),
      { cookie },
    )

    expect(result).toEqual({ ok: true, value: 'signed-out' })
    expect(response.headers.get('set-cookie')).toBe(
      `${sessionCookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`,
    )
  })
})
