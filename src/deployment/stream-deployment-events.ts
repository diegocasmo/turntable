import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { deploymentTargetSchema } from '@/deployment/schema'
import {
  streamExpiredDeploymentSession,
  streamRailwayDeploymentEvents,
} from '@/deployment/stream-deployment-events.server'
import { loadConfigMiddleware } from '@/server-functions/middleware'
import { InvalidSessionError, readSession } from '@/session/cookie.server'

export const streamDeploymentEvents = createServerFn({ method: 'GET' })
  .middleware([loadConfigMiddleware])
  .validator(deploymentTargetSchema)
  .handler(async ({ context, data }) => {
    try {
      const session = await readSession(context.config.sessionSecret)
      return streamRailwayDeploymentEvents({
        apiUrl: context.config.railwayApiUrl,
        session,
        signal: getRequest().signal,
        target: data,
        webSocketUrl: context.config.railwayWebSocketUrl,
      })
    } catch (error) {
      if (error instanceof InvalidSessionError) return streamExpiredDeploymentSession()
      throw error
    }
  })
