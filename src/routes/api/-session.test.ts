import { requestHandler } from '@tanstack/react-start/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSessionRouteHandlers } from '@/routes/api/session'
import {
  maximumSessionTokenByteLength,
  sessionCookieName,
  sessionLifetimeSeconds,
  writeSession,
} from '@/session.server'

const appOrigin = 'https://turntable.test'
const apiUrl = 'https://backboard.railway.test/graphql/v2'
const currentDate = new Date('2027-01-15T12:00:00.000Z')
const sessionSecret = Buffer.alloc(32, 1).toString('base64')
const token = 'railway-token-that-must-not-leak'

const validRailwayBody = {
  data: {
    projects: {
      edges: [
        {
          node: {
            id: 'project-1',
            name: 'Turntable',
            primaryEnvironmentId: 'environment-1',
            workspace: { id: 'workspace-1', name: 'Workspace' },
          },
        },
      ],
    },
  },
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status })
}

function setup(response: Response, configuredOrigin = appOrigin) {
  const fetchRequest = vi.fn(async (_request: Request) => response)
  const handlers = createSessionRouteHandlers({
    appOrigin: configuredOrigin,
    fetch: fetchRequest,
    railwayApiUrl: apiUrl,
    sessionSecret,
  })

  return { fetchRequest, handlers }
}

function runRequest(request: Request, operation: () => Promise<Response>) {
  return requestHandler(operation)(request, {})
}

async function createSessionCookie() {
  const request = new Request(`${appOrigin}/api/session`)
  const response = await runRequest(request, async () => {
    await writeSession(token, sessionSecret)
    return new Response(null, { status: 204 })
  })
  const setCookie = response.headers.getSetCookie()[0]

  if (setCookie === undefined) {
    throw new Error('The response did not set a session cookie.')
  }

  const cookie = setCookie.split(';', 1)[0]

  if (cookie === undefined) {
    throw new Error('The session cookie was empty.')
  }

  return cookie
}

function createPostRequest(value = token, origin: string | null = appOrigin) {
  const headers = new Headers({ 'content-type': 'application/json' })

  if (origin !== null) {
    headers.set('origin', origin)
  }

  return new Request(`${appOrigin}/api/session`, {
    body: JSON.stringify({ token: value }),
    headers,
    method: 'POST',
  })
}

function createDeleteRequest(cookie: string) {
  return new Request(`${appOrigin}/api/session`, {
    headers: { cookie, origin: appOrigin },
    method: 'DELETE',
  })
}

async function readResponse(response: Response) {
  return {
    body: await response.text(),
    headers: Object.fromEntries(response.headers),
    status: response.status,
  }
}

describe('session route', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(currentDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('verifies a valid token and writes only its encrypted session', async () => {
    const { fetchRequest, handlers } = setup(jsonResponse(validRailwayBody))
    const request = createPostRequest()
    const response = await runRequest(request, () => handlers.POST(request))
    const result = await readResponse(response)
    const expires = new Date(currentDate.getTime() + sessionLifetimeSeconds * 1_000).toUTCString()

    expect(result.status).toBe(204)
    expect(result.body).toBe('')
    expect(result.headers['cache-control']).toBe('no-store')
    expect(result.headers['set-cookie']).toMatch(
      new RegExp(
        `^${sessionCookieName}=[^;]+; Max-Age=${sessionLifetimeSeconds}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Strict$`,
      ),
    )
    expect(result.headers['set-cookie']).not.toContain('Domain=')
    expect(JSON.stringify(result)).not.toContain(token)

    const railwayRequest = fetchRequest.mock.calls[0]?.[0]

    expect(railwayRequest?.headers.get('authorization')).toBe(`Bearer ${token}`)
    await expect(railwayRequest?.json()).resolves.toEqual({
      query: expect.stringContaining('query Projects'),
    })
  })

  it('returns Railway authorization failure without exposing the token', async () => {
    const { handlers } = setup(jsonResponse({ errors: [{ message: `Not Authorized: ${token}` }] }))
    const request = createPostRequest()
    const result = await readResponse(await runRequest(request, () => handlers.POST(request)))

    expect(result).toEqual({
      body: JSON.stringify({ error: 'Not Authorized: [REDACTED]' }),
      headers: {
        'cache-control': 'no-store',
        'content-type': 'application/json',
      },
      status: 401,
    })
    expect(JSON.stringify(result)).not.toContain(token)
  })

  it('rejects a Railway body that is not GraphQL', async () => {
    const { handlers } = setup(jsonResponse({ message: 'Problem processing request' }))
    const request = createPostRequest()
    const result = await readResponse(await runRequest(request, () => handlers.POST(request)))

    expect(result.status).toBe(502)
    expect(JSON.parse(result.body)).toEqual({ error: 'Railway could not verify this token.' })
    expect(result.headers['cache-control']).toBe('no-store')
  })

  it('rejects an empty token before it calls Railway', async () => {
    const { fetchRequest, handlers } = setup(jsonResponse(validRailwayBody))
    const request = createPostRequest('')
    const result = await readResponse(await runRequest(request, () => handlers.POST(request)))

    expect(result.status).toBe(400)
    expect(JSON.parse(result.body)).toEqual({
      error: 'The request body must contain a valid Railway token.',
    })
    expect(fetchRequest).not.toHaveBeenCalled()
  })

  it.each([
    ['a cross-site request', 'https://attacker.test', appOrigin],
    ['an origin that differs from APP_ORIGIN', appOrigin, 'https://configured.test'],
    ['a request without an Origin header', null, appOrigin],
  ])('rejects %s', async (_name, origin, configuredOrigin) => {
    const { fetchRequest, handlers } = setup(jsonResponse(validRailwayBody), configuredOrigin)
    const request = createPostRequest(token, origin)
    const result = await readResponse(await runRequest(request, () => handlers.POST(request)))

    expect(result.status).toBe(403)
    expect(result.headers['cache-control']).toBe('no-store')
    expect(fetchRequest).not.toHaveBeenCalled()
  })

  it('clears an expired cookie and returns 401', async () => {
    const cookie = await createSessionCookie()
    vi.advanceTimersByTime(sessionLifetimeSeconds * 1_000)
    const { handlers } = setup(jsonResponse(validRailwayBody))
    const request = createDeleteRequest(cookie)
    const result = await readResponse(await runRequest(request, () => handlers.DELETE(request)))

    expect(result).toEqual({
      body: JSON.stringify({ error: 'The session is invalid or expired.' }),
      headers: {
        'cache-control': 'no-store',
        'content-type': 'application/json',
        'set-cookie': `${sessionCookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`,
      },
      status: 401,
    })
  })

  it('clears a valid session on logout', async () => {
    const cookie = await createSessionCookie()
    const { handlers } = setup(jsonResponse(validRailwayBody))
    const request = createDeleteRequest(cookie)
    const result = await readResponse(await runRequest(request, () => handlers.DELETE(request)))

    expect(result.status).toBe(204)
    expect(result.body).toBe('')
    expect(result.headers['cache-control']).toBe('no-store')
    expect(result.headers['set-cookie']).toBe(
      `${sessionCookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`,
    )
  })

  it('keeps the largest accepted token cookie below the browser limit', async () => {
    const largestToken = 't'.repeat(maximumSessionTokenByteLength)
    const { handlers } = setup(jsonResponse(validRailwayBody))
    const request = createPostRequest(largestToken)
    const response = await runRequest(request, () => handlers.POST(request))
    const cookie = response.headers.get('set-cookie') ?? ''

    expect(response.status).toBe(204)
    expect(new TextEncoder().encode(cookie).byteLength).toBeLessThan(4_096)
    expect(cookie).not.toContain(largestToken)
  })
})
