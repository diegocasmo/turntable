import { print } from 'graphql'
import {
  createClient,
  type FormattedExecutionResult,
  MessageType,
  parseMessage,
  type SubscribeMessage,
  stringifyMessage,
} from 'graphql-ws/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { deploymentStatusSubscription } from '@/gql/operations/deployment-status-subscription'
import {
  createRailwaySubscriptionClient,
  type RailwayWebSocketImplementation,
} from '@/railway/create-railway-subscription-client.server'
import { testRailwayToken } from '@/test/railway'

type WebSocketArgument = ConstructorParameters<RailwayWebSocketImplementation>[1]
type Result = FormattedExecutionResult<Record<string, unknown>>
type Scenario =
  | Readonly<{ kind: 'close'; code: number; reason: string }>
  | Readonly<{ kind: 'error'; message: string }>
  | Readonly<{ kind: 'graphql-errors'; messages: readonly string[] }>
  | Readonly<{ kind: 'results'; results: readonly Result[] }>
  | Readonly<{ kind: 'silent' }>

const testRailwayWebSocketUrl = 'wss://backboard.railway.test/graphql/v2'
const sockets: ControlledWebSocket[] = []
let scenario: Scenario

class ControlledWebSocket {
  static readonly CLOSED = 3
  static readonly CLOSING = 2
  static readonly CONNECTING = 0
  static readonly OPEN = 1

  readonly closeCalls: Array<{ code: number | undefined; reason: string | undefined }> = []
  onclose: ((event: Readonly<{ code: number; reason: string }>) => void) | null = null
  onerror: ((event: Readonly<{ message: string }>) => void) | null = null
  onmessage: ((event: Readonly<{ data: string }>) => void) | null = null
  onopen: ((event: Readonly<Record<string, never>>) => void) | null = null
  readyState = ControlledWebSocket.CONNECTING
  subscribeMessage: SubscribeMessage | undefined

  constructor(
    readonly url: string | URL,
    readonly argument?: WebSocketArgument,
  ) {
    sockets.push(this)
    queueMicrotask(() => {
      this.readyState = ControlledWebSocket.OPEN
      this.onopen?.({})
    })
  }

  close(code?: number, reason?: string) {
    if (this.readyState === ControlledWebSocket.CLOSED) {
      return
    }

    this.closeCalls.push({ code, reason })
    this.readyState = ControlledWebSocket.CLOSING
    queueMicrotask(() => this.emitClose(code ?? 1000, reason ?? ''))
  }

  send(data: string) {
    const message = parseMessage(data)

    if (message.type === MessageType.ConnectionInit) {
      queueMicrotask(() => this.emitMessage(stringifyMessage({ type: MessageType.ConnectionAck })))
      return
    }

    if (message.type !== MessageType.Subscribe) {
      return
    }

    this.subscribeMessage = message

    if (this.readAuthorization() !== `Bearer ${testRailwayToken}`) {
      return
    }

    this.runScenario(message.id)
  }

  private emitClose(code: number, reason: string) {
    this.readyState = ControlledWebSocket.CLOSED
    this.onclose?.({ code, reason })
  }

  private emitMessage(data: string) {
    this.onmessage?.({ data })
  }

  private readAuthorization() {
    if (
      this.argument === undefined ||
      typeof this.argument === 'string' ||
      Array.isArray(this.argument)
    ) {
      return null
    }

    return new Headers(this.argument.headers).get('authorization')
  }

  private runScenario(id: string) {
    const activeScenario = scenario

    if (activeScenario.kind === 'silent') {
      return
    }

    if (activeScenario.kind === 'close') {
      queueMicrotask(() => this.emitClose(activeScenario.code, activeScenario.reason))
      return
    }

    if (activeScenario.kind === 'error') {
      queueMicrotask(() => {
        this.onerror?.({ message: activeScenario.message })
        this.emitClose(1006, activeScenario.message)
      })
      return
    }

    if (activeScenario.kind === 'graphql-errors') {
      queueMicrotask(() =>
        this.emitMessage(
          stringifyMessage({
            id,
            payload: activeScenario.messages.map((message) => ({ message })),
            type: MessageType.Error,
          }),
        ),
      )
      return
    }

    for (const result of activeScenario.results) {
      queueMicrotask(() =>
        this.emitMessage(stringifyMessage({ id, payload: result, type: MessageType.Next })),
      )
    }
  }
}

function createTestClient() {
  return createRailwaySubscriptionClient({
    token: testRailwayToken,
    webSocketImplementation: ControlledWebSocket,
    webSocketUrl: testRailwayWebSocketUrl,
  })
}

function createDeploymentStatus(status: 'CRASHED' | 'SUCCESS' = 'SUCCESS') {
  return {
    deploymentStopped: status === 'CRASHED',
    id: 'deployment-1',
    status,
  }
}

function subscribeToDeployment(client: ReturnType<typeof createTestClient>) {
  return client.subscribe({
    document: deploymentStatusSubscription,
    variables: { deploymentId: 'deployment-1' },
  })
}

async function waitForSubscribe(socket: ControlledWebSocket) {
  for (let attempt = 0; attempt < 20 && socket.subscribeMessage === undefined; attempt += 1) {
    await Promise.resolve()
  }

  expect(socket.subscribeMessage).toBeDefined()
}

function readSocket() {
  const socket = sockets[0]
  if (socket === undefined) {
    throw new Error('Expected a controlled WebSocket.')
  }
  return socket
}

beforeEach(() => {
  sockets.length = 0
  scenario = { kind: 'silent' }
})

describe('Railway subscription client', () => {
  it('sends the authorization header and yields controlled status events', async () => {
    scenario = {
      kind: 'results',
      results: [
        { data: { deployment: createDeploymentStatus() } },
        { data: { deployment: createDeploymentStatus('CRASHED') } },
      ],
    }
    const client = createTestClient()
    const subscription = subscribeToDeployment(client)

    await expect(subscription.next()).resolves.toEqual({
      done: false,
      value: { deployment: createDeploymentStatus() },
    })
    await expect(subscription.next()).resolves.toEqual({
      done: false,
      value: { deployment: createDeploymentStatus('CRASHED') },
    })

    const socket = readSocket()
    expect(socket.url).toBe(testRailwayWebSocketUrl)
    expect(socket.argument).toEqual({
      headers: { authorization: `Bearer ${testRailwayToken}` },
      protocols: 'graphql-transport-ws',
    })
    expect(socket.subscribeMessage?.payload).toEqual({
      query: print(deploymentStatusSubscription),
      variables: { deploymentId: 'deployment-1' },
    })
    const done = subscription.next()
    await client.close()
    expect(socket.closeCalls).toEqual([{ code: 1000, reason: 'Normal Closure' }])
    await expect(done).resolves.toEqual({ done: true, value: undefined })
  })

  it('receives silence when the WebSocket has no authorization header', async () => {
    scenario = {
      kind: 'results',
      results: [{ data: { deployment: createDeploymentStatus() } }],
    }
    const client = createClient({
      retryAttempts: 0,
      url: testRailwayWebSocketUrl,
      webSocketImpl: ControlledWebSocket,
    })
    const subscription = client.iterate({
      query: print(deploymentStatusSubscription),
      variables: { deploymentId: 'deployment-1' },
    })
    let settled = false
    const next = subscription.next().finally(() => {
      settled = true
    })

    const socket = readSocket()
    await waitForSubscribe(socket)
    await Promise.resolve()

    expect(socket.argument).toBe('graphql-transport-ws')
    expect(socket.readyState).toBe(ControlledWebSocket.OPEN)
    expect(settled).toBe(false)

    await client.dispose()
    await expect(next).resolves.toEqual({ done: true, value: undefined })
  })

  it('reports an upstream close and does not retry', async () => {
    scenario = { kind: 'close', code: 1011, reason: `Railway unavailable: ${testRailwayToken}` }
    const client = createTestClient()

    await expect(subscribeToDeployment(client).next()).rejects.toMatchObject({
      code: 1011,
      message: 'Railway subscription closed with code 1011: Railway unavailable: [REDACTED]',
      name: 'RailwaySubscriptionError',
    })
    expect(sockets).toHaveLength(1)
  })

  it('redacts a token in a GraphQL error', async () => {
    scenario = {
      kind: 'graphql-errors',
      messages: [`Not Authorized: ${testRailwayToken}`],
    }
    const client = createTestClient()

    await expect(subscribeToDeployment(client).next()).rejects.toMatchObject({
      message: 'Not Authorized: [REDACTED]',
      messages: ['Not Authorized: [REDACTED]'],
      name: 'RailwayGraphQLError',
    })
  })

  it('redacts a token in an upstream error event', async () => {
    scenario = { kind: 'error', message: testRailwayToken }
    const client = createTestClient()

    await expect(subscribeToDeployment(client).next()).rejects.toMatchObject({
      message: 'Railway subscription failed: [REDACTED]',
      name: 'RailwaySubscriptionError',
    })
  })
})
