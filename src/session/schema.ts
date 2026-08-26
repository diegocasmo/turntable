import { z } from '@/zod'

export const maximumSessionTokenByteLength = 512
export const invalidRailwayTokenMessage = `The Railway token must contain 1 to ${maximumSessionTokenByteLength} UTF-8 bytes.`

function measureTokenByteLength(token: string) {
  return new TextEncoder().encode(token).byteLength
}

export const railwayTokenSchema = z.string().check(
  z.minLength(1, invalidRailwayTokenMessage),
  z.refine(
    (token) => measureTokenByteLength(token) <= maximumSessionTokenByteLength,
    invalidRailwayTokenMessage,
  ),
)

export const sessionInputSchema = z.object({ token: railwayTokenSchema })

export type SessionState = 'authenticated' | 'expired' | 'signed-out'
