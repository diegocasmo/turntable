import { WebSocket as NodeWebSocket } from 'node:http'
import type { TadaDocumentNode } from 'gql.tada'
import { print } from 'graphql'
import { createClient, MessageType, parseMessage } from 'graphql-ws/client'
import { z } from 'zod'
import {
  RailwayGraphQLError,
  RailwayResponseError,
  RailwaySubscriptionError,
} from '@/railway/errors'
import { graphQLErrorSchema, readRailwayGraphQLData } from '@/railway/graphql-response'
import { redactToken } from '@/railway/token-redaction'

type WebSocketOptions = Readonly<{
  headers?: HeadersInit
  protocols?: string | string[]
}>

export type RailwayWebSocketImplementation = {
  new (
    url: string | URL,
    protocols?: string | string[] | WebSocketOptions,
  ): {
    send(data: string): void
  }
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
const graphQLErrorListSchema = z.array(graphQLErrorSchema).min(1)

function createSubscriptionStart() {
  return Promise.withResolvers<void>()
}

type SubscriptionStart = ReturnType<typeof createSubscriptionStart>

function createAuthorizedWebSocket(
  WebSocketImplementation: RailwayWebSocketImplementation,
  token: string,
  subscriptionStarts: SubscriptionStart[],
) {
  return class AuthorizedWebSocket extends WebSocketImplementation {
    constructor(url: string | URL, protocols?: string | string[]) {
      const headers = { authorization: `Bearer ${token}` }
      super(url, protocols === undefined ? { headers } : { headers, protocols })
    }

    override send(data: string) {
      super.send(data)
      if (parseMessage(data).type === MessageType.Subscribe) {
        subscriptionStarts.shift()?.resolve()
      }
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
      graphQLErrors.data.map((item) => redactToken(item.message, token)),
    )
  }

  const closeEvent = closeEventSchema.safeParse(error)

  if (closeEvent.success) {
    return new RailwaySubscriptionError(
      closeEvent.data.code,
      redactToken(closeEvent.data.reason, token),
    )
  }

  const errorEvent = errorEventSchema.safeParse(error)

  if (errorEvent.success) {
    return new RailwaySubscriptionError(undefined, redactToken(errorEvent.data.message, token))
  }

  return new RailwaySubscriptionError(undefined)
}

async function* iterateRailwaySubscription<Result>(
  results: AsyncIterable<unknown>,
  token: string,
  start: SubscriptionStart,
  subscriptionStarts: SubscriptionStart[],
) {
  subscriptionStarts.push(start)

  try {
    for await (const result of results) {
      yield readRailwayGraphQLData<Result>(result, token)
    }

    start.reject(new RailwaySubscriptionError(undefined))
  } catch (error) {
    const railwayError = readRailwaySubscriptionError(error, token)
    start.reject(railwayError)
    throw railwayError
  } finally {
    const index = subscriptionStarts.indexOf(start)
    if (index !== -1) subscriptionStarts.splice(index, 1)
  }
}

export function createRailwaySubscriptionClient({
  token,
  webSocketImplementation = NodeWebSocket,
  webSocketUrl,
}: RailwaySubscriptionClientOptions) {
  const subscriptionStarts: SubscriptionStart[] = []
  const client = createClient({
    lazy: true,
    retryAttempts: 0,
    url: webSocketUrl,
    webSocketImpl: createAuthorizedWebSocket(webSocketImplementation, token, subscriptionStarts),
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
      const start = createSubscriptionStart()
      const results = client.iterate<unknown>({
        query: print(input.document),
        variables: input.variables,
      })

      return {
        events: iterateRailwaySubscription<Result>(results, token, start, subscriptionStarts),
        subscribed: start.promise,
      }
    },
  }
}
