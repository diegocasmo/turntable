import type { TadaDocumentNode } from 'gql.tada'
import { type DocumentNode, print } from 'graphql'
import { z } from 'zod'
import { formatRequestLog } from '@/logging'
import {
  RailwayGraphQLError,
  RailwayHttpError,
  RailwayRateLimitError,
  RailwayResponseError,
} from '@/railway/errors'

const graphQLErrorSchema = z.object({ message: z.string() })
const graphQLResponseSchema = z
  .looseObject({
    data: z.record(z.string(), z.unknown()).nullable().optional(),
    errors: z.array(graphQLErrorSchema).optional(),
  })
  .refine(
    (value) =>
      Object.hasOwn(value, 'data') || (value.errors !== undefined && value.errors.length > 0),
  )
const graphQLBodyKind: 'graphql' = 'graphql'
const otherBodyKind: 'other' = 'other'
const railwayResponseBodySchema = z.union([
  graphQLResponseSchema.transform((value) => ({
    kind: graphQLBodyKind,
    value,
  })),
  z.json().transform((value) => ({ kind: otherBodyKind, value })),
])

type ErrorWriter = (line: string) => void
type Fetch = (request: Request) => Promise<Response>

type RailwayClientOptions = Readonly<{
  apiUrl: string
  fetch?: Fetch
  writeError?: ErrorWriter
}>

type RailwayRequest<Result, Variables> = Readonly<{
  document: TadaDocumentNode<Result, Variables>
  token: string
  variables: NoInfer<Variables>
}>

function readRetryAfterSeconds(value: string | null) {
  if (value === null || !/^\d+$/.test(value)) {
    return undefined
  }

  const seconds = Number(value)
  return Number.isSafeInteger(seconds) ? seconds : undefined
}

function createRequest(
  apiUrl: string,
  document: DocumentNode,
  token: string,
  variables: unknown | undefined,
) {
  const body =
    variables === undefined ? { query: print(document) } : { query: print(document), variables }

  return new Request(apiUrl, {
    body: JSON.stringify(body),
    headers: {
      authorization: `Bearer ${token}`,
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
    async request<Result, Variables>(input: RailwayRequest<Result, Variables>): Promise<Result> {
      const request = createRequest(apiUrl, input.document, input.token, input.variables)
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

      if (body.value.errors !== undefined && body.value.errors.length > 0) {
        throw new RailwayGraphQLError(body.value.errors.map((error) => error.message))
      }

      if (body.value.data === undefined || body.value.data === null) {
        throw new RailwayResponseError()
      }

      return body.value.data as Result
    },
  }
}
