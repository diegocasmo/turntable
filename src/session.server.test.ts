import { requestHandler } from '@tanstack/react-start/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSessionCookie,
  InvalidSessionError,
  maximumSessionTokenByteLength,
  readSession,
  sessionCookieName,
  sessionLifetimeSeconds,
  writeSession,
} from '@/session.server'

const currentDate = new Date('2027-01-15T08:00:00.000Z')
const sessionSecret = Buffer.alloc(32, 1).toString('base64')
const differentSessionSecret = Buffer.alloc(32, 2).toString('base64')
const token = 'railway-workspace-token'

type OperationResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ error: unknown; ok: false }>

async function runRequest<T>(operation: () => Promise<T>, headers?: HeadersInit) {
  let result: OperationResult<T> = {
    error: new Error('The request handler did not run.'),
    ok: false,
  }

  const handle = requestHandler(async () => {
    try {
      const value = await operation()
      result = { ok: true, value }
      return new Response(null, { status: 204 })
    } catch (error) {
      result = { error, ok: false }
      return new Response(null, { status: 401 })
    }
  })

  const request =
    headers === undefined
      ? new Request('https://turntable.test/session')
      : new Request('https://turntable.test/session', { headers })
  const response = await handle(request, {})
  return { response, result }
}

function readCookie(setCookie: string) {
  const cookie = setCookie.split(';', 1)[0]

  if (cookie === undefined) {
    throw new Error('The response did not contain a cookie.')
  }

  return cookie
}

function cookieValue(cookie: string) {
  const separatorIndex = cookie.indexOf('=')

  if (separatorIndex < 0) {
    throw new Error('The cookie did not contain a value.')
  }

  return cookie.slice(separatorIndex + 1)
}

function changeLastCharacter(value: string) {
  const lastCharacter = value.at(-1)

  if (lastCharacter === undefined) {
    throw new Error('The value was empty.')
  }

  return `${value.slice(0, -1)}${lastCharacter === 'A' ? 'B' : 'A'}`
}

describe('framework session', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(currentDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('round trips a valid session without renewal', async () => {
    const created = await runRequest(() => writeSession(token, sessionSecret))
    const setCookie = created.response.headers.getSetCookie()[0]

    if (setCookie === undefined) {
      throw new Error('The response did not set a session cookie.')
    }

    const read = await runRequest(() => readSession(sessionSecret), {
      Cookie: readCookie(setCookie),
    })

    expect(read.result).toEqual({
      ok: true,
      value: {
        expiresAtUnixSeconds: Math.floor(currentDate.getTime() / 1_000) + sessionLifetimeSeconds,
        token,
      },
    })
    expect(read.response.headers.getSetCookie()).toEqual([])
  })

  it('sets one bounded cookie with the required attributes', async () => {
    const lastAcceptedToken = 'é'.repeat(maximumSessionTokenByteLength / 2)
    const { response } = await runRequest(() => writeSession(lastAcceptedToken, sessionSecret))
    const setCookies = response.headers.getSetCookie()
    const expires = new Date(currentDate.getTime() + sessionLifetimeSeconds * 1_000).toUTCString()

    expect(setCookies).toHaveLength(1)
    expect(setCookies[0]).toMatch(
      new RegExp(
        `^${sessionCookieName}=Fe26\\.2\\*\\*.+; Max-Age=${sessionLifetimeSeconds}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Strict$`,
      ),
    )
    expect(Buffer.byteLength(setCookies[0] ?? '')).toBeLessThan(4_096)
    expect(response.headers.toString()).not.toContain(lastAcceptedToken)
    await expect(response.text()).resolves.not.toContain(lastAcceptedToken)
  })

  it('rejects the first token length above the limit', async () => {
    const firstRejectedToken = `${'é'.repeat(maximumSessionTokenByteLength / 2)}a`
    const { response, result } = await runRequest(() =>
      writeSession(firstRejectedToken, sessionSecret),
    )

    expect(result).toEqual({ error: expect.any(RangeError), ok: false })
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it('rejects a changed cookie', async () => {
    const created = await runRequest(() => writeSession(token, sessionSecret))
    const setCookie = created.response.headers.getSetCookie()[0]

    if (setCookie === undefined) {
      throw new Error('The response did not set a session cookie.')
    }

    const changedCookie = changeLastCharacter(readCookie(setCookie))
    const { response, result } = await runRequest(() => readSession(sessionSecret), {
      Cookie: changedCookie,
    })

    expect(result).toEqual({ error: expect.any(InvalidSessionError), ok: false })
    expect(response.headers.getSetCookie()).toEqual([
      `${sessionCookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`,
    ])
  })

  it('rejects a cookie sealed with a different key', async () => {
    const created = await runRequest(() => writeSession(token, sessionSecret))
    const setCookie = created.response.headers.getSetCookie()[0]

    if (setCookie === undefined) {
      throw new Error('The response did not set a session cookie.')
    }

    const { result } = await runRequest(() => readSession(differentSessionSecret), {
      Cookie: readCookie(setCookie),
    })

    expect(result).toEqual({ error: expect.any(InvalidSessionError), ok: false })
  })

  it('rejects a session at its absolute expiry', async () => {
    const created = await runRequest(() => writeSession(token, sessionSecret))
    const setCookie = created.response.headers.getSetCookie()[0]

    if (setCookie === undefined) {
      throw new Error('The response did not set a session cookie.')
    }

    vi.advanceTimersByTime(sessionLifetimeSeconds * 1_000)
    const { result } = await runRequest(() => readSession(sessionSecret), {
      Cookie: readCookie(setCookie),
    })

    expect(result).toEqual({ error: expect.any(InvalidSessionError), ok: false })
  })

  it('does not accept the H3 session header', async () => {
    const created = await runRequest(() => writeSession(token, sessionSecret))
    const setCookie = created.response.headers.getSetCookie()[0]

    if (setCookie === undefined) {
      throw new Error('The response did not set a session cookie.')
    }

    const { result } = await runRequest(() => readSession(sessionSecret), {
      [`x-${sessionCookieName.toLowerCase()}-session`]: cookieValue(readCookie(setCookie)),
    })

    expect(result).toEqual({ error: expect.any(InvalidSessionError), ok: false })
  })

  it('clears the cookie with the required attributes', async () => {
    const { response } = await runRequest(() => clearSessionCookie(sessionSecret))

    expect(response.headers.getSetCookie()).toEqual([
      `${sessionCookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`,
    ])
  })
})
