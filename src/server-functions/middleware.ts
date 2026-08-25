import { createMiddleware } from '@tanstack/react-start'
import { getRequest, setResponseHeader, setResponseStatus } from '@tanstack/react-start/server'
import { loadConfig } from '@/config.server'

export class RequestOriginError extends Error {
  override readonly name = 'RequestOriginError'

  constructor() {
    super('The request origin is not allowed.')
  }
}

export function requireAppOrigin(request: Request, appOrigin: string) {
  if (request.headers.get('origin') !== appOrigin) {
    throw new RequestOriginError()
  }
}

export const loadConfigMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    setResponseHeader('cache-control', 'no-store')
    return next({ context: { config: loadConfig() } })
  },
)

export const requireAppOriginMiddleware = createMiddleware({ type: 'function' })
  .middleware([loadConfigMiddleware])
  .server(async ({ context, next }) => {
    try {
      requireAppOrigin(getRequest(), context.config.appOrigin)
    } catch (error) {
      setResponseStatus(403)
      throw error
    }

    return next()
  })
