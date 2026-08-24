import { z } from 'zod'
import { formatRequestLog } from '../logging.ts'
import {
  RailwayGraphQLError,
  RailwayHttpError,
  RailwayRateLimitError,
  RailwayResponseError,
} from './errors.ts'

const graphQLErrorSchema = z.object({ message: z.string() })
const graphQLEnvelopeSchema = z
  .looseObject({
    data: z.unknown().optional(),
    errors: z.array(graphQLErrorSchema).optional(),
  })
  .refine(
    (value) =>
      Object.hasOwn(value, 'data') || (value.errors !== undefined && value.errors.length > 0),
  )
const graphQLBodyKind: 'graphql' = 'graphql'
const otherBodyKind: 'other' = 'other'
const railwayResponseBodySchema = z.union([
  graphQLEnvelopeSchema.transform((envelope) => ({
    envelope,
    kind: graphQLBodyKind,
  })),
  z.json().transform((body) => ({ body, kind: otherBodyKind })),
])

type ErrorWriter = (line: string) => void
type Fetch = (request: Request) => Promise<Response>
type Variables = Readonly<Record<string, unknown>>

type RailwayClientOptions = Readonly<{
  apiUrl: string
  fetch?: Fetch
  writeError?: ErrorWriter
}>

type RailwayRequest<Data> = Readonly<{
  dataSchema: z.ZodType<Data>
  query: string
  token: string
  variables?: Variables
}>

function readRetryAfterSeconds(value: string | null) {
  if (value === null || !/^\d+$/.test(value)) {
    return undefined
  }

  const seconds = Number(value)
  return Number.isSafeInteger(seconds) ? seconds : undefined
}

function createRequest(apiUrl: string, input: RailwayRequest<unknown>) {
  const body =
    input.variables === undefined
      ? { query: input.query }
      : { query: input.query, variables: input.variables }

  return new Request(apiUrl, {
    body: JSON.stringify(body),
    headers: {
      authorization: `Bearer ${input.token}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  })
}

function decodeResponseBody(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text)
    return value
  } catch {
    return text
  }
}

async function readResponseBody(response: Response) {
  const text = await response.text()
  return railwayResponseBodySchema.parse(decodeResponseBody(text))
}

export function createRailwayClient({
  apiUrl,
  fetch: fetchRequest = globalThis.fetch,
  writeError = console.error,
}: RailwayClientOptions) {
  return {
    async request<Data>(input: RailwayRequest<Data>) {
      const request = createRequest(apiUrl, input)
      const response = await fetchRequest(request)
      const body = await readResponseBody(response)

      if (response.status === 429) {
        throw new RailwayRateLimitError(readRetryAfterSeconds(response.headers.get('retry-after')))
      }

      if (response.status !== 200) {
        writeError(
          formatRequestLog(`Railway answered with HTTP status ${response.status}.`, request),
        )
        throw new RailwayHttpError(response.status)
      }

      if (body.kind !== graphQLBodyKind) {
        throw new RailwayResponseError()
      }

      if (body.envelope.errors !== undefined && body.envelope.errors.length > 0) {
        throw new RailwayGraphQLError(body.envelope.errors.map((error) => error.message))
      }

      const data = input.dataSchema.safeParse(body.envelope.data)

      if (!data.success) {
        throw new RailwayResponseError()
      }

      return data.data
    },
  }
}
