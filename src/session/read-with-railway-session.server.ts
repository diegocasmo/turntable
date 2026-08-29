import { redirect } from '@tanstack/react-router'
import {
  checkRailwayUnauthorized,
  RailwayGraphQLError,
  RailwayRateLimitError,
} from '@/railway/errors'
import {
  InvalidSessionError,
  readSession,
  SessionNoticeError,
  writeSessionNotice,
} from '@/session/cookie.server'
import type { SessionNotice } from '@/session/schema'

function createRailwayReadError(error: unknown) {
  if (error instanceof RailwayGraphQLError || error instanceof RailwayRateLimitError) {
    return new Error(error.message)
  }

  return new Error('Turntable could not load Railway data. Try again.')
}

function createConnectRedirect(notice: SessionNotice) {
  return redirect({
    reloadDocument: true,
    search: { notice, redirect: '/projects' },
    to: '/connect',
  })
}

export async function readWithRailwaySession<Value>(
  sessionSecret: string,
  readValue: (token: string) => Promise<Value>,
) {
  try {
    const token = await readSession(sessionSecret)
    return await readValue(token)
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      await writeSessionNotice('expired', sessionSecret)
      throw createConnectRedirect('expired')
    }

    if (error instanceof SessionNoticeError) {
      await writeSessionNotice(error.notice, sessionSecret)
      throw createConnectRedirect(error.notice)
    }

    if (checkRailwayUnauthorized(error)) {
      await writeSessionNotice('token-rejected', sessionSecret)
      throw createConnectRedirect('token-rejected')
    }

    throw createRailwayReadError(error)
  }
}
