import { z } from 'zod'
import { RailwayGraphQLError, RailwayResponseError } from '@/railway/errors'
import { redactRailwayToken } from '@/railway/token-redaction'

export const railwayGraphQLErrorSchema = z.object({ message: z.string() })

const railwayGraphQLResponseSchema = z
  .looseObject({
    data: z.record(z.string(), z.unknown()).nullable().optional(),
    errors: z.array(railwayGraphQLErrorSchema).optional(),
  })
  .refine(
    (value) =>
      Object.hasOwn(value, 'data') || (value.errors !== undefined && value.errors.length > 0),
  )

export function readRailwayGraphQLData<Result>(body: unknown, token: string): Result {
  const result = railwayGraphQLResponseSchema.safeParse(body)

  if (!result.success) {
    throw new RailwayResponseError()
  }

  if (result.data.errors !== undefined && result.data.errors.length > 0) {
    throw new RailwayGraphQLError(
      result.data.errors.map((error) => redactRailwayToken(error.message, token)),
    )
  }

  if (result.data.data === undefined || result.data.data === null) {
    throw new RailwayResponseError()
  }

  return result.data.data as Result
}
