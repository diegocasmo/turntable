export function createNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createSecurityHeaders(nonce: string) {
  const connectSources = import.meta.env.DEV ? "'self' ws://127.0.0.1:* ws://localhost:*" : "'self'"

  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'`,
      `style-src 'self' 'nonce-${nonce}'`,
      `connect-src ${connectSources}`,
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  }
}
