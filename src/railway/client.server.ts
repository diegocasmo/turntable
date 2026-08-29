import type { TadaDocumentNode } from 'gql.tada'
import { print } from 'graphql'
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

function decodeResponseBody(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text)
    return value
  } catch {
    return text
  }
}

export function createRailwayClient({
  apiUrl,
  fetch: fetchRequest = globalThis.fetch,
  writeError = console.error,
}: RailwayClientOptions) {
  return {
    async request<Result, Variables>(input: RailwayRequest<Result, Variables>): Promise<Result> {
      const request = new Request(apiUrl, {
        body: JSON.stringify({ query: print(input.document), variables: input.variables }),
        headers: {
          authorization: `Bearer ${input.token}`,
          'content-type': 'application/json',
        },
        method: 'POST',
        signal: input.signal ?? null,
      })
      const response = await fetchRequest(request)
      const body = z.json().parse(decodeResponseBody(await response.text()))

      if (response.status === 429) {
        throw new RailwayRateLimitError()
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
