import { InvalidSessionError, readStoredSessionState } from '@/session/cookie.server'
import type { SessionState } from '@/session/schema'

export async function readSessionState(
  sessionSecret: string,
  hasSessionCookie: boolean,
): Promise<SessionState> {
  if (!hasSessionCookie) {
    return 'signed-out'
  }

  try {
    return await readStoredSessionState(sessionSecret)
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      return 'expired'
    }

    throw error
  }
}
