import { describe, expect, it, vi } from 'vitest'
import { connectRailwaySession, SessionConnectionError } from '@/session/connect.server'
import { rejectedRailwayTokenMessage } from '@/session/connection-errors'
import { sessionCookieName } from '@/session/cookie.server'
import { testSessionSecret } from '@/test/fixtures'
import {
  createRailwayResponse,
  testRailwayApiUrl,
  testRailwayToken,
  testRailwayWorkspaceId,
} from '@/test/railway'
import { createJsonResponse } from '@/test/response'
import { runServerRequest } from '@/test/start-request'

const sessionConfig = {
  railwayApiUrl: testRailwayApiUrl,
  sessionSecret: testSessionSecret,
}
const validRailwayBody = createRailwayResponse({
  apiToken: { workspaces: [{ id: testRailwayWorkspaceId }] },
})

describe('connect Railway session', () => {
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
      query: expect.stringContaining('query ApiTokenWorkspaces'),
      variables: {},
    })
  })

  it('returns clear guidance for a rejected token', async () => {
    const fetchRequest = vi.fn(async () =>
      createJsonResponse({ errors: [{ message: 'Not Authorized' }] }),
    )
    const { result } = await runServerRequest(() =>
      connectRailwaySession(testRailwayToken, sessionConfig, fetchRequest),
    )

    expect(result).toEqual({
      error: new SessionConnectionError(rejectedRailwayTokenMessage),
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
