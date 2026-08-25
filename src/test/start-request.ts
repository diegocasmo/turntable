import { requestHandler } from '@tanstack/react-start/server'
import { testAppOrigin } from '@/test/fixtures'

type OperationResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ error: unknown; ok: false }>

export async function runServerRequest<T>(operation: () => Promise<T>, headers?: HeadersInit) {
  let result: OperationResult<T> = {
    error: new Error('The request handler did not run.'),
    ok: false,
  }

  const handle = requestHandler(async () => {
    try {
      const value = await operation()
      result = { ok: true, value }
      return new Response(null, { status: 204 })
    } catch (error) {
      result = { error, ok: false }
      return new Response(null, { status: 500 })
    }
  })
  const request = new Request(
    `${testAppOrigin}/session`,
    headers === undefined ? undefined : { headers },
  )
  const response = await handle(request, {})

  return { response, result }
}

export function readFirstCookie(response: Response) {
  const setCookie = response.headers.getSetCookie()[0]

  if (setCookie === undefined) {
    throw new Error('The response did not set a cookie.')
  }

  const cookie = setCookie.split(';', 1)[0]

  if (cookie === undefined) {
    throw new Error('The response cookie was empty.')
  }

  return cookie
}
