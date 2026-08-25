import { createServerFn } from '@tanstack/react-start'
import { RailwayGraphQLError, RailwayRateLimitError } from '@/railway/errors'
import { redactRailwayToken } from '@/railway/redact-token.server'
import { readRailwayEnvironments } from '@/selection/read-environments.server'
import { readRailwayProjects } from '@/selection/read-projects.server'
import { readRailwayServices } from '@/selection/read-services.server'
import { readEnvironmentsInputSchema, readServicesInputSchema } from '@/selection/schema'
import { loadConfigMiddleware } from '@/server-functions/middleware'
import { InvalidSessionError, readSession } from '@/session/cookie.server'

type SelectionConfig = Readonly<{
  railwayApiUrl: string
  sessionSecret: string
}>

function createSelectionReadError(error: unknown, token?: string) {
  if (error instanceof InvalidSessionError) {
    return new Error('Your session expired. Sign in to Railway again.')
  }

  if (error instanceof RailwayGraphQLError && token !== undefined) {
    return new Error(redactRailwayToken(error.message, token))
  }

  if (error instanceof RailwayRateLimitError) {
    return new Error(error.message)
  }

  return new Error('Turntable could not load Railway choices. Try again.')
}

async function readWithSession<Result>(
  config: SelectionConfig,
  read: (token: string, apiUrl: string) => Promise<Result>,
) {
  let token: string | undefined

  try {
    const session = await readSession(config.sessionSecret)
    token = session.token
    return await read(token, config.railwayApiUrl)
  } catch (error) {
    throw createSelectionReadError(error, token)
  }
}

export const readProjects = createServerFn({ method: 'GET' })
  .middleware([loadConfigMiddleware])
  .handler(({ context }) => readWithSession(context.config, readRailwayProjects))

export const readEnvironments = createServerFn({ method: 'GET' })
  .middleware([loadConfigMiddleware])
  .validator(readEnvironmentsInputSchema)
  .handler(({ context, data }) =>
    readWithSession(context.config, (token, apiUrl) =>
      readRailwayEnvironments(token, apiUrl, data.projectId),
    ),
  )

export const readServices = createServerFn({ method: 'GET' })
  .middleware([loadConfigMiddleware])
  .validator(readServicesInputSchema)
  .handler(({ context, data }) =>
    readWithSession(context.config, (token, apiUrl) =>
      readRailwayServices(token, apiUrl, data.projectId, data.environmentId),
    ),
  )
