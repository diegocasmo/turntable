import { clearSession, getSession, updateSession } from '@tanstack/react-start/server'
import {
  invalidRailwayTokenMessage,
  railwayTokenSchema,
  type SessionNotice,
  type SessionState,
  sessionNoticeSchema,
} from '@/session/schema'
import { z } from '@/zod'

export const sessionCookieName = '__Host-turntable'
export const sessionLifetimeSeconds = 60 * 60

export class InvalidSessionError extends Error {
  override readonly name = 'InvalidSessionError'

  constructor() {
    super('The session is invalid or expired.')
  }
}

export class SessionNoticeError extends Error {
  override readonly name = 'SessionNoticeError'

  constructor(readonly notice: SessionNotice) {
    super('The session ended.')
  }
}

function createSessionConfig(sessionSecret: string): Parameters<typeof getSession>[0] {
  return {
    cookie: {
      httpOnly: true,
      maxAge: sessionLifetimeSeconds,
      path: '/',
      sameSite: 'strict',
      secure: true,
    },
    maxAge: sessionLifetimeSeconds,
    name: sessionCookieName,
    password: sessionSecret,
    sessionHeader: false,
  }
}

const sessionDataSchema = z.union([
  z.object({ railwayToken: railwayTokenSchema }),
  z.object({ notice: sessionNoticeSchema }),
])

type SessionData = z.infer<typeof sessionDataSchema>

async function writeSessionData(replacement: SessionData, sessionSecret: string) {
  const config = createSessionConfig(sessionSecret)

  await clearSession(config)
  await updateSession<Record<string, unknown>>(config, (data) => {
    for (const key of Object.keys(data)) delete data[key]
    return replacement
  })
}

export async function writeSession(token: string, sessionSecret: string) {
  if (!railwayTokenSchema.safeParse(token).success) {
    throw new RangeError(invalidRailwayTokenMessage)
  }

  await writeSessionData({ railwayToken: token }, sessionSecret)
}

export function writeSessionNotice(notice: SessionNotice, sessionSecret: string) {
  return writeSessionData({ notice }, sessionSecret)
}

async function readSessionData(sessionSecret: string) {
  const config = createSessionConfig(sessionSecret)
  const session = await getSession<SessionData>(config)
  const data = sessionDataSchema.safeParse(session.data)
  const expiresAt = session.createdAt + sessionLifetimeSeconds * 1_000

  if (!data.success || Date.now() >= expiresAt) {
    await clearSession(config)
    throw new InvalidSessionError()
  }

  return data.data
}

export async function readSession(sessionSecret: string) {
  const data = await readSessionData(sessionSecret)

  if ('notice' in data) {
    throw new SessionNoticeError(data.notice)
  }

  return data.railwayToken
}

export async function readStoredSessionState(
  sessionSecret: string,
): Promise<Exclude<SessionState, 'signed-out'>> {
  const data = await readSessionData(sessionSecret)

  if ('railwayToken' in data) {
    return 'authenticated'
  }

  await clearSessionCookie(sessionSecret)
  return data.notice
}

export function clearSessionCookie(sessionSecret: string) {
  return clearSession(createSessionConfig(sessionSecret))
}
