import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sessionCookieName, sessionLifetimeSeconds, writeSession } from '@/session/cookie.server'
import { disconnectRailwaySession } from '@/session/disconnect.server'
import { testRailwayToken, testSessionSecret } from '@/test/fixtures'
import { readFirstCookie, runServerRequest } from '@/test/start-request'

const currentDate = new Date('2027-01-15T12:00:00.000Z')
const clearedSessionCookie = `${sessionCookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`

async function createSessionCookie() {
  const created = await runServerRequest(() => writeSession(testRailwayToken, testSessionSecret))
  return readFirstCookie(created.response)
}

describe('disconnect Railway session', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(currentDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clears a valid session', async () => {
    const cookie = await createSessionCookie()
    const { response, result } = await runServerRequest(
      () => disconnectRailwaySession(testSessionSecret),
      { cookie },
    )

    expect(result).toEqual({ ok: true, value: 'signed-out' })
    expect(response.headers.get('set-cookie')).toBe(clearedSessionCookie)
  })

  it('reports and clears an expired session', async () => {
    const cookie = await createSessionCookie()

    vi.advanceTimersByTime(sessionLifetimeSeconds * 1_000)
    const { response, result } = await runServerRequest(
      () => disconnectRailwaySession(testSessionSecret),
      { cookie },
    )

    expect(result).toEqual({ ok: true, value: 'expired' })
    expect(response.headers.get('set-cookie')).toBe(clearedSessionCookie)
  })
})
