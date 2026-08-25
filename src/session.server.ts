import { clearSession, getSession, updateSession } from '@tanstack/react-start/server'
import { z } from 'zod'
import { projectsQuery } from '@/gql/operations/projects'
import { createRailwayClient } from '@/railway/client.server'
import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
import { invalidRailwayTokenMessage, railwayTokenSchema, type SessionState } from '@/session-schema'

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

export class SessionActionError extends Error {
  override readonly name = 'SessionActionError'
}

type FetchRequest = (request: Request) => Promise<Response>

type SessionConnectionConfig = Readonly<{
  railwayApiUrl: string
  sessionSecret: string
}>

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

const sessionDataSchema = z.object({
  railwayToken: railwayTokenSchema,
})

type SessionData = z.infer<typeof sessionDataSchema>

function checkToken(token: string) {
  if (!railwayTokenSchema.safeParse(token).success) {
    throw new RangeError(invalidRailwayTokenMessage)
  }
}

function createTurntableSession(token: string, createdAt: number): TurntableSession {
  return {
    expiresAtUnixSeconds: Math.floor(createdAt / 1_000) + sessionLifetimeSeconds,
    token,
  }
}

function redactToken(message: string, token: string) {
  return message.replaceAll(token, '[REDACTED]')
}

function createTokenVerificationError(error: unknown, token: string) {
  if (error instanceof RailwayGraphQLError) {
    return new SessionActionError(redactToken(error.message, token))
  }

  if (error instanceof RailwayRateLimitError) {
    return new SessionActionError(error.message)
  }

  return new SessionActionError('Railway could not verify this token.')
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

export function requireAppOrigin(request: Request, appOrigin: string) {
  if (request.headers.get('origin') !== appOrigin) {
    throw new SessionActionError('The request origin is not allowed.')
  }
}

export async function connectRailwaySession(
  token: string,
  config: SessionConnectionConfig,
  fetchRequest: FetchRequest = globalThis.fetch,
) {
  const railwayClient = createRailwayClient({ apiUrl: config.railwayApiUrl, fetch: fetchRequest })

  try {
    await railwayClient.request({ document: projectsQuery, token, variables: {} })
  } catch (error) {
    throw createTokenVerificationError(error, token)
  }

  await writeSession(token, config.sessionSecret)
}

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
      return 'expired'
    }

    throw error
  }
}

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
