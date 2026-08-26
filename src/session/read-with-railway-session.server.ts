import { redirect } from '@tanstack/react-router'
import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
import { clearSessionCookie, InvalidSessionError, readSession } from '@/session/cookie.server'

function createRailwayReadError(error: unknown) {
  if (error instanceof RailwayGraphQLError || error instanceof RailwayRateLimitError) {
    return new Error(error.message)
  }

  return new Error('Turntable could not load Railway data. Try again.')
}

function createConnectRedirect() {
  return redirect({ reloadDocument: true, search: true, to: '/' })
}

export async function readWithRailwaySession<Value>(
  sessionSecret: string,
  readValue: (token: string) => Promise<Value>,
) {
  try {
    const session = await readSession(sessionSecret)
    return await readValue(session.token)
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      throw createConnectRedirect()
    }

    if (error instanceof RailwayGraphQLError && error.isUnauthorized) {
      await clearSessionCookie(sessionSecret)
      throw createConnectRedirect()
    }

    throw createRailwayReadError(error)
  }
}
