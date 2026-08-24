import { EncryptJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import {
  decryptSessionEnvelope,
  encryptSessionEnvelope,
  InvalidSessionEnvelopeError,
  maximumSessionTokenByteLength,
  sessionEnvelopeType,
  sessionLifetimeSeconds,
} from '@/session-envelope.server'

const currentUnixSeconds = 1_800_000_000
const currentDate = new Date(currentUnixSeconds * 1_000)
const expiryUnixSeconds = currentUnixSeconds + sessionLifetimeSeconds
const sessionSecret = Uint8Array.from({ length: 32 }, (_, index) => index)
const token = 'railway-workspace-token'

function encryptFixture(
  payload: Readonly<Record<string, string | number>>,
  protectedHeader: Readonly<{ alg: string; enc: string; typ: string }>,
) {
  return new EncryptJWT(payload)
    .setProtectedHeader(protectedHeader)
    .setExpirationTime(expiryUnixSeconds)
    .encrypt(sessionSecret)
}

function corruptCiphertext(value: string) {
  const parts = value.split('.')
  const ciphertextIndex = 3
  const ciphertext = parts[ciphertextIndex]

  if (ciphertext === undefined || ciphertext.length === 0) {
    throw new Error('The test fixture is not a compact JWE.')
  }

  parts[ciphertextIndex] = `${ciphertext[0] === 'A' ? 'B' : 'A'}${ciphertext.slice(1)}`
  return parts.join('.')
}

describe('session envelope', () => {
  it('encrypts and decrypts a session with the exact expiry', async () => {
    const value = await encryptSessionEnvelope(token, sessionSecret, currentDate)

    expect(value.split('.')).toHaveLength(5)
    await expect(decryptSessionEnvelope(value, sessionSecret, currentDate)).resolves.toEqual({
      expiresAtUnixSeconds: expiryUnixSeconds,
      token,
    })
  })

  it('rejects a corrupted compact JWE', async () => {
    const value = await encryptSessionEnvelope(token, sessionSecret, currentDate)

    await expect(
      decryptSessionEnvelope(corruptCiphertext(value), sessionSecret, currentDate),
    ).rejects.toBeInstanceOf(InvalidSessionEnvelopeError)
  })

  it('rejects a different valid 32-byte key', async () => {
    const value = await encryptSessionEnvelope(token, sessionSecret, currentDate)
    const differentSecret = Uint8Array.from(sessionSecret, (byte) => byte ^ 255)

    await expect(
      decryptSessionEnvelope(value, differentSecret, currentDate),
    ).rejects.toBeInstanceOf(InvalidSessionEnvelopeError)
  })

  it('rejects an envelope at its exact expiry', async () => {
    const value = await encryptSessionEnvelope(token, sessionSecret, currentDate)
    const expiryDate = new Date(expiryUnixSeconds * 1_000)

    await expect(decryptSessionEnvelope(value, sessionSecret, expiryDate)).rejects.toBeInstanceOf(
      InvalidSessionEnvelopeError,
    )
  })

  it('rejects a wrong protected type', async () => {
    const value = await encryptFixture(
      { railwayToken: 'dG9rZW4' },
      { alg: 'dir', enc: 'A256GCM', typ: 'not-a-turntable-session' },
    )

    await expect(decryptSessionEnvelope(value, sessionSecret, currentDate)).rejects.toBeInstanceOf(
      InvalidSessionEnvelopeError,
    )
  })

  it('rejects an unsupported key-management algorithm', async () => {
    const value = await encryptFixture(
      { railwayToken: 'dG9rZW4' },
      { alg: 'A256GCMKW', enc: 'A256GCM', typ: sessionEnvelopeType },
    )

    await expect(decryptSessionEnvelope(value, sessionSecret, currentDate)).rejects.toBeInstanceOf(
      InvalidSessionEnvelopeError,
    )
  })

  it('rejects an unsupported encryption algorithm', async () => {
    const value = await encryptFixture(
      { railwayToken: 'dG9rZW4' },
      { alg: 'dir', enc: 'A128CBC-HS256', typ: sessionEnvelopeType },
    )

    await expect(decryptSessionEnvelope(value, sessionSecret, currentDate)).rejects.toBeInstanceOf(
      InvalidSessionEnvelopeError,
    )
  })

  it('rejects an invalid application payload', async () => {
    const value = await encryptFixture(
      { railwayToken: 123 },
      { alg: 'dir', enc: 'A256GCM', typ: sessionEnvelopeType },
    )

    await expect(decryptSessionEnvelope(value, sessionSecret, currentDate)).rejects.toBeInstanceOf(
      InvalidSessionEnvelopeError,
    )
  })

  it('accepts the last token length in UTF-8 bytes', async () => {
    const lastAcceptedToken = 'é'.repeat(maximumSessionTokenByteLength / 2)
    const value = await encryptSessionEnvelope(lastAcceptedToken, sessionSecret, currentDate)

    await expect(decryptSessionEnvelope(value, sessionSecret, currentDate)).resolves.toMatchObject({
      token: lastAcceptedToken,
    })
  })

  it('rejects the first token length above the limit', async () => {
    const firstRejectedToken = `${'é'.repeat(maximumSessionTokenByteLength / 2)}a`

    await expect(
      encryptSessionEnvelope(firstRejectedToken, sessionSecret, currentDate),
    ).rejects.toThrow(`${maximumSessionTokenByteLength} UTF-8 bytes`)
  })
})
