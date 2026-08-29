const redacted = '[REDACTED]'
const privateHeaders = new Set(['authorization', 'cookie', 'set-cookie'])

export function formatRequestLog(message: string, request: Request) {
  const headers = Object.fromEntries(
    Array.from(request.headers, ([name, value]) => [
      name,
      privateHeaders.has(name.toLowerCase()) ? redacted : value,
    ]),
  )

  return JSON.stringify({
    message,
    request: { headers, method: request.method, url: request.url },
  })
}

export function formatLog(message: string) {
  return JSON.stringify({ message })
}
