import { InvalidSessionError, readSession } from '@/session/cookie.server'
import type { SessionState } from '@/session/schema'

export async function readSessionState(
  sessionSecret: string,
  hasSessionCookie: boolean,
): Promise<SessionState> {
  if (!hasSessionCookie) {
    return 'signed-out'
  }

  try {
    await readSession(sessionSecret)
    return 'authenticated'
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      return 'ended'
    }

    throw error
  }
}
