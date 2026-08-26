import { WebSocket as NodeWebSocket } from 'node:http'
import type { TadaDocumentNode } from 'gql.tada'
import { print } from 'graphql'
import { type Client, createClient } from 'graphql-ws/client'
import { z } from 'zod'
import {
  RailwayGraphQLError,
  RailwayResponseError,
  RailwaySubscriptionError,
} from '@/railway/errors'
import { railwayGraphQLErrorSchema, readRailwayGraphQLData } from '@/railway/graphql-response'
import { redactRailwayToken } from '@/railway/token-redaction'

type WebSocketOptions = Readonly<{
  headers?: HeadersInit
  protocols?: string | string[]
}>

export type RailwayWebSocketImplementation = {
  new (url: string | URL, protocols?: string | string[] | WebSocketOptions): object
  readonly CLOSED: number
  readonly CLOSING: number
  readonly CONNECTING: number
  readonly OPEN: number
}

type RailwaySubscriptionClientOptions = Readonly<{
  token: string
  webSocketImplementation?: RailwayWebSocketImplementation
  webSocketUrl: string
}>

type RailwaySubscriptionRequest<Result, Variables extends Record<string, unknown>> = Readonly<{
  document: TadaDocumentNode<Result, Variables>
  variables: NoInfer<Variables>
}>

const closeEventSchema = z.object({ code: z.number().int(), reason: z.string() })
const errorEventSchema = z.object({ message: z.string() })
const graphQLErrorListSchema = z.array(railwayGraphQLErrorSchema).min(1)

function createAuthorizedWebSocket(
  WebSocketImplementation: RailwayWebSocketImplementation,
  token: string,
) {
  return class AuthorizedWebSocket extends WebSocketImplementation {
    constructor(url: string | URL, protocols?: string | string[]) {
      const headers = { authorization: `Bearer ${token}` }
      super(url, protocols === undefined ? { headers } : { headers, protocols })
    }
  }
}

function readRailwaySubscriptionError(error: unknown, token: string) {
  if (
    error instanceof RailwayGraphQLError ||
    error instanceof RailwayResponseError ||
    error instanceof RailwaySubscriptionError
  ) {
    return error
  }

  const graphQLErrors = graphQLErrorListSchema.safeParse(error)

  if (graphQLErrors.success) {
    return new RailwayGraphQLError(
      graphQLErrors.data.map((item) => redactRailwayToken(item.message, token)),
    )
  }

  const closeEvent = closeEventSchema.safeParse(error)

  if (closeEvent.success) {
    return new RailwaySubscriptionError(
      closeEvent.data.code,
      redactRailwayToken(closeEvent.data.reason, token),
    )
  }

  const errorEvent = errorEventSchema.safeParse(error)

  if (errorEvent.success) {
    return new RailwaySubscriptionError(
      undefined,
      redactRailwayToken(errorEvent.data.message, token),
    )
  }

  return new RailwaySubscriptionError(undefined)
}

async function* iterateRailwaySubscription<Result, Variables extends Record<string, unknown>>(
  client: Client,
  token: string,
  input: RailwaySubscriptionRequest<Result, Variables>,
) {
  try {
    const results = client.iterate<unknown>({
      query: print(input.document),
      variables: input.variables,
    })

    for await (const result of results) {
      yield readRailwayGraphQLData<Result>(result, token)
    }
  } catch (error) {
    throw readRailwaySubscriptionError(error, token)
  }
}

export function createRailwaySubscriptionClient({
  token,
  webSocketImplementation = NodeWebSocket,
  webSocketUrl,
}: RailwaySubscriptionClientOptions) {
  const client = createClient({
    lazy: true,
    retryAttempts: 0,
    url: webSocketUrl,
    webSocketImpl: createAuthorizedWebSocket(webSocketImplementation, token),
  })

  return {
    async close() {
      try {
        await client.dispose()
      } catch (error) {
        throw readRailwaySubscriptionError(error, token)
      }
    },
    subscribe<Result, Variables extends Record<string, unknown>>(
      input: RailwaySubscriptionRequest<Result, Variables>,
    ) {
      return iterateRailwaySubscription(client, token, input)
    },
  }
}
