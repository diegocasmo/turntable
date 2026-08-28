import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  InvalidSessionError,
  readSession,
  sessionCookieName,
  sessionLifetimeSeconds,
  writeSession,
} from '@/session/cookie.server'
import { maximumSessionTokenByteLength } from '@/session/schema'
import { testSessionSecret } from '@/test/fixtures'
import { testRailwayToken } from '@/test/railway'
import { readFirstCookie, runServerRequest } from '@/test/start-request'

const currentDate = new Date('2027-01-15T08:00:00.000Z')

function changeLastCharacter(value: string) {
  const lastCharacter = value.at(-1)

  if (lastCharacter === undefined) {
    throw new Error('The value was empty.')
  }

  return `${value.slice(0, -1)}${lastCharacter === 'A' ? 'B' : 'A'}`
}

describe('framework session', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('round trips a valid session without renewal', async () => {
    const created = await runServerRequest(() => writeSession(testRailwayToken, testSessionSecret))
    const read = await runServerRequest(() => readSession(testSessionSecret), {
      Cookie: readFirstCookie(created.response),
    })

    expect(read.result).toEqual({ ok: true, value: testRailwayToken })
    expect(read.response.headers.getSetCookie()).toEqual([])
  })

  it('sets one bounded cookie with the required attributes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(currentDate)
    const lastAcceptedToken = 'é'.repeat(maximumSessionTokenByteLength / 2)
    const { response } = await runServerRequest(() =>
      writeSession(lastAcceptedToken, testSessionSecret),
    )
    const setCookies = response.headers.getSetCookie()
    const expires = new Date(currentDate.getTime() + sessionLifetimeSeconds * 1_000).toUTCString()

    expect(setCookies).toHaveLength(1)
    expect(setCookies[0]).toMatch(
      new RegExp(
        `^${sessionCookieName}=[^;]+; Max-Age=${sessionLifetimeSeconds}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Strict$`,
      ),
    )
    expect(Buffer.byteLength(setCookies[0] ?? '')).toBeLessThan(4_096)
    expect(response.headers.toString()).not.toContain(lastAcceptedToken)
    await expect(response.text()).resolves.not.toContain(lastAcceptedToken)
  })

  it.each([
    ['an empty token', ''],
    ['the first token length above the limit', `${'é'.repeat(maximumSessionTokenByteLength / 2)}a`],
  ])('rejects %s', async (_name, rejectedToken) => {
    const { response, result } = await runServerRequest(() =>
      writeSession(rejectedToken, testSessionSecret),
    )

    expect(result).toEqual({ error: expect.any(RangeError), ok: false })
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it('rejects a changed cookie', async () => {
    const created = await runServerRequest(() => writeSession(testRailwayToken, testSessionSecret))
    const changedCookie = changeLastCharacter(readFirstCookie(created.response))
    const { response, result } = await runServerRequest(() => readSession(testSessionSecret), {
      Cookie: changedCookie,
    })

    expect(result).toEqual({ error: expect.any(InvalidSessionError), ok: false })
    expect(response.headers.getSetCookie()).toEqual([
      `${sessionCookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`,
    ])
  })

  it('rejects a session at its absolute expiry', async () => {
    vi.useFakeTimers()
    const created = await runServerRequest(() => writeSession(testRailwayToken, testSessionSecret))

    vi.advanceTimersByTime(sessionLifetimeSeconds * 1_000)
    const { result } = await runServerRequest(() => readSession(testSessionSecret), {
      Cookie: readFirstCookie(created.response),
    })

    expect(result).toEqual({ error: expect.any(InvalidSessionError), ok: false })
  })

  it('does not accept the H3 session header', async () => {
    const created = await runServerRequest(() => writeSession(testRailwayToken, testSessionSecret))
    const cookie = readFirstCookie(created.response)
    const cookieValue = cookie.slice(`${sessionCookieName}=`.length)
    const { result } = await runServerRequest(() => readSession(testSessionSecret), {
      [`x-${sessionCookieName.toLowerCase()}-session`]: cookieValue,
    })

    expect(result).toEqual({ error: expect.any(InvalidSessionError), ok: false })
  })
})
