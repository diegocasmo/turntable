import { Buffer } from 'node:buffer'
import { z } from 'zod'
import { formatLog } from './logging.ts'

export const railwayApiUrl = 'https://backboard.railway.com/graphql/v2'
export const railwayWebSocketUrl = 'wss://backboard.railway.com/graphql/v2'

type Environment = Readonly<Record<string, string | undefined>>
type ErrorWriter = (line: string) => void

const sessionSecretSchema = z.string().refine((value) => {
  const secret = Buffer.from(value, 'base64')
  return secret.byteLength === 32 && secret.toString('base64') === value
}, 'must be 32 bytes in canonical base64')

const httpUrlSchema = z.url().refine((value) => {
  const url = new URL(value)
  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.username === '' &&
    url.password === ''
  )
}, 'must use http or https without credentials')

const webSocketUrlSchema = z.url().refine((value) => {
  const url = new URL(value)
  return (
    (url.protocol === 'ws:' || url.protocol === 'wss:') &&
    url.username === '' &&
    url.password === ''
  )
}, 'must use ws or wss without credentials')

const appOriginSchema = httpUrlSchema
  .refine((value) => {
    const url = new URL(value)
    return url.pathname === '/' && url.search === '' && url.hash === ''
  }, 'must be an origin without a path, query, or fragment')
  .transform((value) => new URL(value).origin)

const environmentSchema = z.object({
  APP_ORIGIN: appOriginSchema,
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RAILWAY_API_URL: httpUrlSchema,
  RAILWAY_WEBSOCKET_URL: webSocketUrlSchema,
  SESSION_SECRET: sessionSecretSchema,
})

export class ConfigurationError extends Error {
  override name = 'ConfigurationError'
}

export function readConfig(environment: Environment) {
  const result = environmentSchema.safeParse(environment)

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new ConfigurationError(`Invalid configuration. ${details}`)
  }

  if (
    result.data.NODE_ENV === 'production' &&
    (result.data.RAILWAY_API_URL !== railwayApiUrl ||
      result.data.RAILWAY_WEBSOCKET_URL !== railwayWebSocketUrl)
  ) {
    throw new ConfigurationError('Production must use the Railway API and WebSocket addresses.')
  }

  return {
    appOrigin: result.data.APP_ORIGIN,
    nodeEnvironment: result.data.NODE_ENV,
    railwayApiUrl: result.data.RAILWAY_API_URL,
    railwayWebSocketUrl: result.data.RAILWAY_WEBSOCKET_URL,
    sessionSecret: result.data.SESSION_SECRET,
  }
}

export function loadConfig(
  environment: Environment = process.env,
  writeError: ErrorWriter = console.error,
) {
  try {
    return readConfig(environment)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid configuration.'
    writeError(formatLog(`Turntable cannot start. ${message}`))
    throw error
  }
}

export function productionEnvironment(environment: Environment) {
  return { ...environment, NODE_ENV: 'production' }
}

export function readPort(value: string | undefined) {
  if (value === undefined || value === '') {
    return 3000
  }

  return z.coerce.number().int().min(1).max(65_535).parse(value)
}
