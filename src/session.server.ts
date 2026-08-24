import { clearSession, getSession, updateSession } from '@tanstack/react-start/server'

export const maximumSessionTokenByteLength = 512
export const sessionCookieName = '__Host-turntable'
export const sessionLifetimeSeconds = 60 * 60

type SessionData = {
  railwayToken?: string
}

export type TurntableSession = Readonly<{
  expiresAtUnixSeconds: number
  token: string
}>

export class InvalidSessionError extends Error {
  override readonly name = 'InvalidSessionError'

  constructor() {
    super('The session is invalid or expired.')
  }
}

function sessionConfig(sessionSecret: string) {
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
  } as const
}

function tokenByteLength(token: string) {
  return new TextEncoder().encode(token).byteLength
}

function checkTokenLength(token: string) {
  if (tokenByteLength(token) > maximumSessionTokenByteLength) {
    throw new RangeError(
      `The Railway token must not exceed ${maximumSessionTokenByteLength} UTF-8 bytes.`,
    )
  }
}

function toTurntableSession(token: string, createdAt: number): TurntableSession {
  return {
    expiresAtUnixSeconds: Math.floor(createdAt / 1_000) + sessionLifetimeSeconds,
    token,
  }
}

export async function writeSession(token: string, sessionSecret: string) {
  checkTokenLength(token)
  const config = sessionConfig(sessionSecret)

  await clearSession(config)
  await updateSession<SessionData>(config, { railwayToken: token })
}

export async function readSession(sessionSecret: string) {
  const config = sessionConfig(sessionSecret)
  const session = await getSession<SessionData>(config)
  const token = session.data.railwayToken
  const expiresAt = session.createdAt + sessionLifetimeSeconds * 1_000

  if (
    typeof token !== 'string' ||
    tokenByteLength(token) > maximumSessionTokenByteLength ||
    Date.now() >= expiresAt
  ) {
    await clearSession(config)
    throw new InvalidSessionError()
  }

  return toTurntableSession(token, session.createdAt)
}

export function clearSessionCookie(sessionSecret: string) {
  return clearSession(sessionConfig(sessionSecret))
}
