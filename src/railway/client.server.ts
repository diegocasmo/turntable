import type { TadaDocumentNode } from 'gql.tada'
import { type DocumentNode, print } from 'graphql'
import { formatRequestLog } from '@/logging'
import { RailwayHttpError, RailwayRateLimitError } from '@/railway/errors'
import { readRailwayGraphQLData } from '@/railway/graphql-response'
import { z } from '@/zod'

type ErrorWriter = (line: string) => void
type Fetch = (request: Request) => Promise<Response>

type RailwayClientOptions = Readonly<{
  apiUrl: string
  fetch?: Fetch
  writeError?: ErrorWriter
}>

type RailwayRequest<Result, Variables> = Readonly<{
  document: TadaDocumentNode<Result, Variables>
  signal?: AbortSignal | undefined
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
  signal: AbortSignal | undefined,
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
    signal: signal ?? null,
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
  return z.json().parse(decodeResponseBody(text))
}

export function createRailwayClient({
  apiUrl,
  fetch: fetchRequest = globalThis.fetch,
  writeError = console.error,
}: RailwayClientOptions) {
  return {
    async request<Result, Variables>(input: RailwayRequest<Result, Variables>): Promise<Result> {
      const request = createRequest(
        apiUrl,
        input.document,
        input.token,
        input.variables,
        input.signal,
      )
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

      return readRailwayGraphQLData<Result>(body, input.token)
    },
  }
}
