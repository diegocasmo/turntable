import { requestHandler } from '@tanstack/react-start/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSessionDelete } from '@/routes/api/session/-delete.server'
import { handleSessionPost } from '@/routes/api/session/-post.server'
import {
  handleSessionRouteRequest,
  type SessionRouteConfig,
} from '@/routes/api/session/-request.server'
import { sessionCookieName, sessionLifetimeSeconds, writeSession } from '@/session.server'

const appOrigin = 'https://turntable.test'
const apiUrl = 'https://backboard.railway.test/graphql/v2'
const currentDate = new Date('2027-01-15T12:00:00.000Z')
const sessionSecret = Buffer.alloc(32, 1).toString('base64')
const token = 'railway-token-that-must-not-leak'
const routeConfig: SessionRouteConfig = {
  appOrigin,
  railwayApiUrl: apiUrl,
  sessionSecret,
}

const validProject = {
  id: 'project-1',
  name: 'Turntable',
  primaryEnvironmentId: 'environment-1',
  workspace: { id: 'workspace-1', name: 'Workspace' },
}
const validRailwayBody = { data: { projects: { edges: [{ node: validProject }] } } }

function createJsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status })
}

function runRequest(request: Request, operation: () => Promise<Response>) {
  return requestHandler(operation)(request, {})
}

function runSessionRoute(
  request: Request,
  config: SessionRouteConfig,
  operation: (config: SessionRouteConfig) => Promise<Response>,
) {
  return runRequest(request, async () => {
    const result = await handleSessionRouteRequest(request, config, async (requestConfig) => ({
      response: await operation(requestConfig),
    }))
    return result instanceof Response ? result : result.response
  })
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

function postSession(
  request: Request,
  fetchRequest: (request: Request) => Promise<Response>,
  config: SessionRouteConfig = routeConfig,
) {
  return runSessionRoute(request, config, (requestConfig) =>
    handleSessionPost(request, requestConfig, fetchRequest),
  )
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

  it('verifies a valid token and forwards only its encrypted session', async () => {
    const fetchRequest = vi.fn(async (_request: Request) => createJsonResponse(validRailwayBody))
    const request = createPostRequest()
    const response = await postSession(request, fetchRequest)
    const result = await readResponse(response)

    expect(result.status).toBe(204)
    expect(result.body).toBe('')
    expect(result.headers['cache-control']).toBe('no-store')
    expect(result.headers['set-cookie']).toMatch(new RegExp(`^${sessionCookieName}=[^;]+;`))
    expect(JSON.stringify(result)).not.toContain(token)

    const railwayRequest = fetchRequest.mock.calls[0]?.[0]

    expect(railwayRequest?.headers.get('authorization')).toBe(`Bearer ${token}`)
    await expect(railwayRequest?.json()).resolves.toEqual({
      query: expect.stringContaining('query Projects'),
    })
  })

  it('returns a Railway authorization failure without exposing the token', async () => {
    const fetchRequest = vi.fn(async () =>
      createJsonResponse({ errors: [{ message: `Not Authorized: ${token}` }] }),
    )
    const request = createPostRequest()
    const result = await readResponse(await postSession(request, fetchRequest))

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
    const fetchRequest = vi.fn(async () =>
      createJsonResponse({ message: 'Problem processing request' }),
    )
    const request = createPostRequest()
    const result = await readResponse(await postSession(request, fetchRequest))

    expect(result.status).toBe(502)
    expect(JSON.parse(result.body)).toEqual({ error: 'Railway could not verify this token.' })
    expect(result.headers['cache-control']).toBe('no-store')
  })

  it('rejects an empty token before it calls Railway', async () => {
    const fetchRequest = vi.fn(async () => createJsonResponse(validRailwayBody))
    const request = createPostRequest('')
    const result = await readResponse(await postSession(request, fetchRequest))

    expect(result.status).toBe(400)
    expect(JSON.parse(result.body)).toEqual({
      error: 'The request body must contain a valid Railway token.',
    })
    expect(fetchRequest).not.toHaveBeenCalled()
  })

  it.each([
    ['a cross-site request', 'https://attacker.test', routeConfig],
    [
      'an origin that differs from APP_ORIGIN',
      appOrigin,
      { ...routeConfig, appOrigin: 'https://configured.test' },
    ],
    ['a malformed origin', 'not an origin', routeConfig],
    ['a request without an Origin header', null, routeConfig],
  ])('rejects %s', async (_name, origin, config) => {
    const fetchRequest = vi.fn(async () => createJsonResponse(validRailwayBody))
    const request = createPostRequest(token, origin)
    const result = await readResponse(await postSession(request, fetchRequest, config))

    expect(result.status).toBe(403)
    expect(result.headers['cache-control']).toBe('no-store')
    expect(fetchRequest).not.toHaveBeenCalled()
  })

  it('clears an expired cookie and returns 401', async () => {
    const cookie = await createSessionCookie()
    vi.advanceTimersByTime(sessionLifetimeSeconds * 1_000)
    const request = createDeleteRequest(cookie)
    const result = await readResponse(
      await runSessionRoute(request, routeConfig, handleSessionDelete),
    )

    expect(result.status).toBe(401)
    expect(JSON.parse(result.body)).toEqual({ error: 'The session is invalid or expired.' })
    expect(result.headers['cache-control']).toBe('no-store')
    expect(result.headers['set-cookie']).toContain(`${sessionCookieName}=; Max-Age=0;`)
  })

  it('clears a valid session on logout', async () => {
    const cookie = await createSessionCookie()
    const request = createDeleteRequest(cookie)
    const result = await readResponse(
      await runSessionRoute(request, routeConfig, handleSessionDelete),
    )

    expect(result).toEqual({
      body: '',
      headers: {
        'cache-control': 'no-store',
        'set-cookie': `${sessionCookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`,
      },
      status: 204,
    })
  })
})
