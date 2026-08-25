import { describe, expect, it } from 'vitest'
import { formatRequestLog } from '@/logging'
import { testAppOrigin } from '@/test/fixtures'
import { testRailwayToken } from '@/test/railway'

describe('request log redaction', () => {
  it('does not log private headers or a request body', () => {
    const request = new Request(`${testAppOrigin}/api/session`, {
      body: testRailwayToken,
      headers: {
        Authorization: `Bearer ${testRailwayToken}`,
        Cookie: `session=${testRailwayToken}`,
        'Set-Cookie': `session=${testRailwayToken}`,
        'X-Request-Id': 'request-1',
      },
      method: 'POST',
    })

    const line = formatRequestLog('request failed', request)

    expect(line).not.toContain(testRailwayToken)
    expect(line).not.toContain('body')
    expect(line).toContain('[REDACTED]')
    expect(line).toContain('request-1')
  })
})
