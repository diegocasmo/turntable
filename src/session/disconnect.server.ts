import { clearSessionCookie, InvalidSessionError, readSession } from '@/session/cookie.server'
import type { SessionState } from '@/session/schema'

export async function disconnectRailwaySession(sessionSecret: string): Promise<SessionState> {
  try {
    await readSession(sessionSecret)
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      return 'expired'
    }

    throw error
  }

  await clearSessionCookie(sessionSecret)
  return 'signed-out'
}
