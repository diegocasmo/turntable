import { createServerFn } from '@tanstack/react-start'
import { requireAppOriginMiddleware } from '@/server-functions/middleware'
import { disconnectRailwaySession } from '@/session/disconnect.server'

function createDisconnectError() {
  return new Error('Turntable could not sign out this browser. Try again.')
}

export const disconnectFromRailway = createServerFn({ method: 'POST' })
  .middleware([requireAppOriginMiddleware])
  .handler(async ({ context }) => {
    try {
      return await disconnectRailwaySession(context.config.sessionSecret)
    } catch {
      throw createDisconnectError()
    }
  })
