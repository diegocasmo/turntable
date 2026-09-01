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

export const sessionNoticeSchema = z.enum(['expired', 'token-rejected'])

export const connectSearchSchema = z.object({
  notice: sessionNoticeSchema.optional().catch(undefined),
  redirect: z
    .string()
    .regex(/^\/(?:projects(?:\/[^?#]*)?|environments\/[^/?#]+\/services)(?:\?[^#]*)?$/u)
    .catch('/projects'),
})

export type SessionNotice = z.infer<typeof sessionNoticeSchema>
export type SessionState = 'authenticated' | 'signed-out' | SessionNotice
