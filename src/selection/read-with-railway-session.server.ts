import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
import { clearSessionCookie, InvalidSessionError, readSession } from '@/session/cookie.server'
import type { RailwaySessionResult } from '@/session/schema'

function createSelectionReadError(error: unknown) {
  if (error instanceof RailwayGraphQLError || error instanceof RailwayRateLimitError) {
    return new Error(error.message)
  }

  return new Error('Turntable could not load Railway choices. Try again.')
}

export async function readWithRailwaySession<Value>(
  sessionSecret: string,
  readValue: (token: string) => Promise<Value>,
): Promise<RailwaySessionResult<Value>> {
  let token: string

  try {
    token = (await readSession(sessionSecret)).token
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      return { kind: 'session-ended' }
    }

    throw createSelectionReadError(error)
  }

  try {
    return { kind: 'success', value: await readValue(token) }
  } catch (error) {
    if (error instanceof RailwayGraphQLError && error.isUnauthorized) {
      await clearSessionCookie(sessionSecret)
      return { kind: 'session-ended' }
    }

    throw createSelectionReadError(error)
  }
}
