import { createMiddleware } from '@tanstack/react-start'
import { loadConfig } from '@/config.server'

const responseHeaders = { 'cache-control': 'no-store' }

export type SessionRouteConfig = Readonly<{
  appOrigin: string
  railwayApiUrl: string
  sessionSecret: string
}>

export function createSessionErrorResponse(error: string, status: number, headers?: HeadersInit) {
  return Response.json(
    { error },
    {
      headers: { ...responseHeaders, ...headers },
      status,
    },
  )
}

export async function handleSessionRouteRequest<Result extends { response: Response }>(
  request: Request,
  config: SessionRouteConfig,
  continueRequest: (config: SessionRouteConfig) => Result | Promise<Result>,
) {
  if (request.headers.get('origin') !== config.appOrigin) {
    return createSessionErrorResponse('The request origin is not allowed.', 403)
  }

  const result = await continueRequest(config)
  result.response.headers.set('cache-control', 'no-store')
  return result
}

export const sessionRouteMiddleware = createMiddleware().server(({ next, request }) =>
  handleSessionRouteRequest(request, loadConfig(), (config) =>
    next({ context: { sessionRouteConfig: config } }),
  ),
)
