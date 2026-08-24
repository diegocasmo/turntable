const redacted = '[REDACTED]'
const privateHeaders = new Set(['authorization', 'cookie', 'set-cookie'])

export function redactHeaders(headers: Headers) {
  return Object.fromEntries(
    Array.from(headers, ([name, value]) => [
      name,
      privateHeaders.has(name.toLowerCase()) ? redacted : value,
    ]),
  )
}

export function formatRequestLog(message: string, request: Request) {
  return JSON.stringify({
    message,
    request: { headers: redactHeaders(request.headers), method: request.method, url: request.url },
  })
}

export function formatLog(message: string) {
  return JSON.stringify({ message })
}
