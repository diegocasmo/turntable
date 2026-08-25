import { clearSession, getSession, updateSession } from '@tanstack/react-start/server'
import { z } from 'zod'

export const maximumSessionTokenByteLength = 512
export const sessionCookieName = '__Host-turntable'
export const sessionLifetimeSeconds = 60 * 60

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

function measureTokenByteLength(token: string) {
  return new TextEncoder().encode(token).byteLength
}

export const railwayTokenSchema = z
  .string()
  .min(1)
  .refine(
    (token) => measureTokenByteLength(token) <= maximumSessionTokenByteLength,
    `must not exceed ${maximumSessionTokenByteLength} UTF-8 bytes`,
  )

const sessionDataSchema = z.object({
  railwayToken: railwayTokenSchema,
})

type SessionData = z.infer<typeof sessionDataSchema>

function checkToken(token: string) {
  if (!railwayTokenSchema.safeParse(token).success) {
    throw new RangeError(
      `The Railway token must contain 1 to ${maximumSessionTokenByteLength} UTF-8 bytes.`,
    )
  }
}

function createTurntableSession(token: string, createdAt: number): TurntableSession {
  return {
    expiresAtUnixSeconds: Math.floor(createdAt / 1_000) + sessionLifetimeSeconds,
    token,
  }
}

export async function writeSession(token: string, sessionSecret: string) {
  checkToken(token)
  const config = createSessionConfig(sessionSecret)

  await clearSession(config)
  await updateSession<SessionData>(config, { railwayToken: token })
}

export async function readSession(sessionSecret: string) {
  const config = createSessionConfig(sessionSecret)
  const session = await getSession<SessionData>(config)
  const data = sessionDataSchema.safeParse(session.data)
  const expiresAt = session.createdAt + sessionLifetimeSeconds * 1_000

  if (!data.success || Date.now() >= expiresAt) {
    await clearSession(config)
    throw new InvalidSessionError()
  }

  return createTurntableSession(data.data.railwayToken, session.createdAt)
}

export function clearSessionCookie(sessionSecret: string) {
  return clearSession(createSessionConfig(sessionSecret))
}
