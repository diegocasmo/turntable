import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import {
  ConfigurationError,
  loadConfig,
  railwayApiUrl,
  railwayWebSocketUrl,
  readConfig,
  readPort,
} from './config.server'

const validEnvironment = {
  APP_ORIGIN: 'http://127.0.0.1:3000',
  NODE_ENV: 'test',
  RAILWAY_API_URL: 'http://127.0.0.1:4000/graphql/v2',
  RAILWAY_WEBSOCKET_URL: 'ws://127.0.0.1:4000/graphql/v2',
  SESSION_SECRET: Buffer.alloc(32, 1).toString('base64'),
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

  it('rejects upstream overrides in production', () => {
    expect(() => readConfig({ ...validEnvironment, NODE_ENV: 'production' })).toThrow(
      'Production must use the Railway API and WebSocket addresses.',
    )
  })

  it('accepts the Railway upstream addresses in production', () => {
    const config = readConfig({
      ...validEnvironment,
      NODE_ENV: 'production',
      RAILWAY_API_URL: railwayApiUrl,
      RAILWAY_WEBSOCKET_URL: railwayWebSocketUrl,
    })

    expect(config.railwayApiUrl).toBe(railwayApiUrl)
  })

  it('logs a clear error before it stops', () => {
    const writeError = vi.fn()

    expect(() => loadConfig({}, writeError)).toThrow(ConfigurationError)
    expect(writeError).toHaveBeenCalledWith(expect.stringContaining('Turntable cannot start.'))
  })

  it('reads the server port', () => {
    expect(readPort('4567')).toBe(4567)
  })
})
