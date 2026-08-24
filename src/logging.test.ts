import { describe, expect, it } from 'vitest'
import { formatRequestLog } from '@/logging'

describe('request log redaction', () => {
  it('does not log private headers or a request body', () => {
    const token = 'railway-token-that-must-not-leak'
    const request = new Request('https://turntable.test/api/session', {
      body: token,
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `session=${token}`,
        'Set-Cookie': `session=${token}`,
        'X-Request-Id': 'request-1',
      },
      method: 'POST',
    })

    const line = formatRequestLog('request failed', request)

    expect(line).not.toContain(token)
    expect(line).not.toContain('body')
    expect(line).toContain('[REDACTED]')
    expect(line).toContain('request-1')
  })
})
