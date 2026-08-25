import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sessionCookieName, sessionLifetimeSeconds, writeSession } from '@/session/cookie.server'
import { readSessionState } from '@/session/read-state.server'
import { testRailwayToken, testSessionSecret } from '@/test/fixtures'
import { readFirstCookie, runServerRequest } from '@/test/start-request'

const currentDate = new Date('2027-01-15T12:00:00.000Z')

describe('read session state', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(currentDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads signed-out, authenticated, and expired states', async () => {
    const signedOut = await runServerRequest(() => readSessionState(testSessionSecret, false))
    const created = await runServerRequest(() => writeSession(testRailwayToken, testSessionSecret))
    const cookie = readFirstCookie(created.response)
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
})
