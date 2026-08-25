import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { connectRailwaySession, SessionConnectionError } from '@/session/connect.server'
import { sessionCookieName } from '@/session/cookie.server'
import {
  testRailwayApiUrl,
  testRailwayEnvironmentId,
  testRailwayProjectId,
  testRailwayToken,
  testSessionSecret,
} from '@/test/fixtures'
import { createJsonResponse } from '@/test/response'
import { runServerRequest } from '@/test/start-request'

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

describe('connect Railway session', () => {
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
      error: new SessionConnectionError('Not Authorized: [REDACTED]'),
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
      error: new SessionConnectionError('Railway could not verify this token.'),
      ok: false,
    })
  })
})
