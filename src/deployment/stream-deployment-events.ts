import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { deploymentStreamInputSchema } from '@/deployment/schema'
import {
  streamExpiredDeploymentSession,
  streamRailwayDeploymentEvents,
} from '@/deployment/stream-deployment-events.server'
import { loadConfigMiddleware } from '@/server-functions/middleware'
import { InvalidSessionError, readSession } from '@/session/cookie.server'

export const streamDeploymentEvents = createServerFn({ method: 'GET' })
  .middleware([loadConfigMiddleware])
  .validator(deploymentStreamInputSchema)
  .handler(async ({ context, data }) => {
    try {
      const session = await readSession(context.config.sessionSecret)
      const { deploymentId, ...target } = data
      return streamRailwayDeploymentEvents({
        apiUrl: context.config.railwayApiUrl,
        deploymentId,
        session,
        signal: getRequest().signal,
        target,
        webSocketUrl: context.config.railwayWebSocketUrl,
      })
    } catch (error) {
      if (error instanceof InvalidSessionError) return streamExpiredDeploymentSession()
      throw error
    }
  })
