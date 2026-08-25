import {
  createSessionErrorResponse,
  type SessionRouteConfig,
} from '@/routes/api/session/-request.server'
import { clearSessionCookie, InvalidSessionError, readSession } from '@/session.server'

export async function handleSessionDelete(config: SessionRouteConfig) {
  try {
    await readSession(config.sessionSecret)
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      return createSessionErrorResponse(error.message, 401)
    }

    throw error
  }

  await clearSessionCookie(config.sessionSecret)
  return new Response(null, { status: 204 })
}
