import { Buffer } from 'node:buffer'
import { z } from 'zod'
import { formatLog } from './logging.ts'
import { railwayHttpsUrlSchema } from './railway/url-schema.ts'

type Environment = Readonly<Record<string, string | undefined>>
type ErrorWriter = (line: string) => void

const sessionSecretSchema = z
  .base64()
  .refine((value) => Buffer.from(value, 'base64').byteLength === 32, 'must be 32 bytes in base64')

const httpUrlSchema = z.url({ protocol: /^https?$/ })

function createAppOriginSchema(protocol: RegExp, protocolError: string) {
  return z
    .url({ protocol, error: protocolError })
    .refine((value) => {
      const url = new URL(value)
      return url.href === `${url.origin}/`
    }, 'must contain only an origin')
    .transform((value) => new URL(value).origin)
}

const appOriginSchema = createAppOriginSchema(/^https?$/, 'must use http or https')
const productionAppOriginSchema = createAppOriginSchema(/^https$/, 'must use https in production')
const sharedEnvironmentShape = { SESSION_SECRET: sessionSecretSchema }

const environmentSchema = z
  .looseObject({ NODE_ENV: z.enum(['development', 'production', 'test']).default('development') })
  .pipe(
    z.discriminatedUnion('NODE_ENV', [
      z.object({
        ...sharedEnvironmentShape,
        APP_ORIGIN: productionAppOriginSchema,
        NODE_ENV: z.literal('production'),
        RAILWAY_API_URL: railwayHttpsUrlSchema,
      }),
      z.object({
        ...sharedEnvironmentShape,
        APP_ORIGIN: appOriginSchema,
        NODE_ENV: z.enum(['development', 'test']),
        RAILWAY_API_URL: httpUrlSchema,
      }),
    ]),
  )

export function readConfig(environment: Environment) {
  const result = environmentSchema.safeParse(environment)

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid configuration. ${details}`)
  }

  return {
    appOrigin: result.data.APP_ORIGIN,
    nodeEnvironment: result.data.NODE_ENV,
    railwayApiUrl: result.data.RAILWAY_API_URL,
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
