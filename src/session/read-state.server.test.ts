import { afterEach, describe, expect, it, vi } from 'vitest'
import { sessionCookieName, sessionLifetimeSeconds, writeSession } from '@/session/cookie.server'
import { readSessionState } from '@/session/read-state.server'
import { testSessionSecret } from '@/test/fixtures'
import { testRailwayToken } from '@/test/railway'
import { readFirstCookie, runServerRequest } from '@/test/start-request'

describe('read session state', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads signed-out, authenticated, and ended states', async () => {
    vi.useFakeTimers()
    const signedOut = await runServerRequest(() => readSessionState(testSessionSecret, false))
    const created = await runServerRequest(() => writeSession(testRailwayToken, testSessionSecret))
    const cookie = readFirstCookie(created.response)
    const authenticated = await runServerRequest(() => readSessionState(testSessionSecret, true), {
      cookie,
    })

    vi.advanceTimersByTime(sessionLifetimeSeconds * 1_000)
    const ended = await runServerRequest(() => readSessionState(testSessionSecret, true), {
      cookie,
    })

    expect(signedOut.result).toEqual({ ok: true, value: 'signed-out' })
    expect(authenticated.result).toEqual({ ok: true, value: 'authenticated' })
    expect(ended.result).toEqual({ ok: true, value: 'ended' })
    expect(ended.response.headers.get('set-cookie')).toContain(`${sessionCookieName}=; Max-Age=0;`)
  })
})
