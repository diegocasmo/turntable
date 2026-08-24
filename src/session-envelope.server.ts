import { Buffer } from 'node:buffer'
import { EncryptJWT, jwtDecrypt } from 'jose'

const keyManagementAlgorithm = 'dir'
const contentEncryptionAlgorithm = 'A256GCM'
const railwayTokenClaim = 'railwayToken'

export const maximumSessionTokenByteLength = 512
export const sessionEnvelopeType = 'turntable-session+jwt'
export const sessionLifetimeSeconds = 60 * 60

export type Session = Readonly<{
  expiresAtUnixSeconds: number
  token: string
}>

export class InvalidSessionEnvelopeError extends Error {
  override readonly name = 'InvalidSessionEnvelopeError'

  constructor() {
    super('The session envelope is invalid or expired.')
  }
}

function readUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1_000)
}

function encodeRailwayToken(token: string) {
  const bytes = new TextEncoder().encode(token)

  if (bytes.byteLength > maximumSessionTokenByteLength) {
    throw new RangeError(
      `The Railway token must not exceed ${maximumSessionTokenByteLength} UTF-8 bytes.`,
    )
  }

  return Buffer.from(bytes).toString('base64url')
}

function decodeRailwayToken(value: unknown) {
  if (typeof value !== 'string') {
    throw new InvalidSessionEnvelopeError()
  }

  const bytes = Buffer.from(value, 'base64url')

  if (bytes.byteLength > maximumSessionTokenByteLength || bytes.toString('base64url') !== value) {
    throw new InvalidSessionEnvelopeError()
  }

  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

export async function encryptSessionEnvelope(
  token: string,
  sessionSecret: Uint8Array,
  currentDate = new Date(),
) {
  const expiresAtUnixSeconds = readUnixSeconds(currentDate) + sessionLifetimeSeconds

  return new EncryptJWT({ [railwayTokenClaim]: encodeRailwayToken(token) })
    .setProtectedHeader({
      alg: keyManagementAlgorithm,
      enc: contentEncryptionAlgorithm,
      typ: sessionEnvelopeType,
    })
    .setExpirationTime(expiresAtUnixSeconds)
    .encrypt(sessionSecret)
}

export async function decryptSessionEnvelope(
  value: string,
  sessionSecret: Uint8Array,
  currentDate = new Date(),
): Promise<Session> {
  try {
    const { payload } = await jwtDecrypt(value, sessionSecret, {
      contentEncryptionAlgorithms: [contentEncryptionAlgorithm],
      currentDate,
      keyManagementAlgorithms: [keyManagementAlgorithm],
      typ: sessionEnvelopeType,
    })

    if (payload.exp === undefined) {
      throw new InvalidSessionEnvelopeError()
    }

    return {
      expiresAtUnixSeconds: payload.exp,
      token: decodeRailwayToken(payload[railwayTokenClaim]),
    }
  } catch {
    throw new InvalidSessionEnvelopeError()
  }
}
