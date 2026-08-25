import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { loadConfig, readConfig, readPort } from '@/config.server'
import { railwayHostname } from '@/railway/url-schema'
import { testAppOrigin, testSessionSecret } from '@/test/fixtures'

const validEnvironment = {
  APP_ORIGIN: 'http://127.0.0.1:3000',
  NODE_ENV: 'test',
  RAILWAY_API_URL: 'http://127.0.0.1:4000/graphql/v2',
  RAILWAY_WEBSOCKET_URL: 'ws://127.0.0.1:4000/graphql/v2',
  SESSION_SECRET: testSessionSecret,
}

const validProductionEnvironment = {
  ...validEnvironment,
  APP_ORIGIN: testAppOrigin,
  NODE_ENV: 'production',
  RAILWAY_API_URL: `https://${railwayHostname}/custom-api-path`,
  RAILWAY_WEBSOCKET_URL: `wss://${railwayHostname}/custom-websocket-path`,
}

describe('configuration', () => {
  it.each(['APP_ORIGIN', 'RAILWAY_API_URL', 'RAILWAY_WEBSOCKET_URL', 'SESSION_SECRET'])(
    'rejects a missing %s',
    (name) => {
      const environment: Record<string, string | undefined> = { ...validEnvironment }
      delete environment[name]

      expect(() => readConfig(environment)).toThrow(name)
    },
  )

  it.each([
    ['APP_ORIGIN', 'https://example.com/path'],
    ['RAILWAY_API_URL', 'ws://example.com/graphql'],
    ['RAILWAY_WEBSOCKET_URL', 'https://example.com/graphql'],
    ['SESSION_SECRET', 'not-base64'],
  ])('rejects an invalid %s', (name, value) => {
    expect(() => readConfig({ ...validEnvironment, [name]: value })).toThrow(name)
  })

  it('rejects a session secret with the wrong size', () => {
    expect(() =>
      readConfig({ ...validEnvironment, SESSION_SECRET: Buffer.alloc(31, 1).toString('base64') }),
    ).toThrow(/SESSION_SECRET: must be 32 bytes/)
  })

  it('rejects an http app origin in production', () => {
    expect(() =>
      readConfig({ ...validProductionEnvironment, APP_ORIGIN: validEnvironment.APP_ORIGIN }),
    ).toThrow('APP_ORIGIN: must use https in production')
  })

  it.each([
    ['RAILWAY_API_URL', 'https://example.com/graphql'],
    ['RAILWAY_WEBSOCKET_URL', 'wss://example.com/graphql'],
  ])('rejects a non-Railway %s hostname in production', (name, value) => {
    expect(() => readConfig({ ...validProductionEnvironment, [name]: value })).toThrow(name)
  })

  it('accepts the Railway upstream addresses in production', () => {
    const config = readConfig(validProductionEnvironment)

    expect(config.railwayApiUrl).toBe(validProductionEnvironment.RAILWAY_API_URL)
    expect(config.sessionSecret).toBe(validProductionEnvironment.SESSION_SECRET)
  })

  it('logs a clear error before it stops', () => {
    const writeError = vi.fn()

    expect(() => loadConfig({}, writeError)).toThrow()
    expect(writeError).toHaveBeenCalledWith(expect.stringContaining('Turntable cannot start.'))
  })

  it('defaults to development', () => {
    const config = readConfig({ ...validEnvironment, NODE_ENV: undefined })

    expect(config.nodeEnvironment).toBe('development')
  })

  it('reads the server port', () => {
    expect(readPort('4567')).toBe(4567)
  })
})
