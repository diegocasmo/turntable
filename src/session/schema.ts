import { z } from '@/zod'

export const maximumSessionTokenByteLength = 512
export const invalidRailwayTokenMessage = `The Railway token must contain 1 to ${maximumSessionTokenByteLength} UTF-8 bytes.`

export const railwayTokenSchema = z.string().check(
  z.minLength(1, invalidRailwayTokenMessage),
  z.refine(
    (token) => new TextEncoder().encode(token).byteLength <= maximumSessionTokenByteLength,
    invalidRailwayTokenMessage,
  ),
)

export const sessionInputSchema = z.object({ token: railwayTokenSchema })

export const connectSearchSchema = z.object({
  redirect: z
    .string()
    .regex(/^\/projects(?:[/?]|$)/u)
    .catch('/projects'),
})

export type SessionState = 'authenticated' | 'expired' | 'signed-out'
