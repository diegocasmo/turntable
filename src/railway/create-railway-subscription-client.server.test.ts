import { print } from 'graphql'
import {
  createClient,
  type Message,
  MessageType,
  parseMessage,
  stringifyMessage,
} from 'graphql-ws/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deploymentStatusSubscription } from '@/gql/operations/deployment-status-subscription'
import {
  createRailwaySubscriptionClient,
  type RailwayWebSocketImplementation,
} from '@/railway/create-railway-subscription-client.server'
import { testRailwayToken } from '@/test/railway'

type WebSocketArgument = ConstructorParameters<RailwayWebSocketImplementation>[1]

const testRailwayWebSocketUrl = 'wss://backboard.railway.test/graphql/v2'
const sockets: ControlledWebSocket[] = []

class ControlledWebSocket {
  static readonly CLOSED = 3
  static readonly CLOSING = 2
  static readonly CONNECTING = 0
  static readonly OPEN = 1

  readonly closeCalls: Array<{ code: number | undefined; reason: string | undefined }> = []
  readonly sentMessages: string[] = []
  onclose: ((event: Readonly<{ code: number; reason: string }>) => void) | null = null
  onerror: ((event: Readonly<{ message: string }>) => void) | null = null
  onmessage: ((event: Readonly<{ data: string }>) => void) | null = null
  onopen: ((event: Readonly<Record<string, never>>) => void) | null = null
  readyState = ControlledWebSocket.CONNECTING

  constructor(
    _url: string | URL,
    readonly argument?: WebSocketArgument,
  ) {
    sockets.push(this)
    queueMicrotask(() => {
      this.readyState = ControlledWebSocket.OPEN
      this.onopen?.({})
    })
  }

  close(code?: number, reason?: string) {
    this.closeCalls.push({ code, reason })
    queueMicrotask(() => this.closeFromServer(code ?? 1000, reason ?? ''))
  }

  closeFromServer(code: number, reason: string) {
    this.readyState = ControlledWebSocket.CLOSED
    this.onclose?.({ code, reason })
  }

  fail(message: string) {
    this.onerror?.({ message })
  }

  receive(message: Message) {
    this.onmessage?.({ data: stringifyMessage(message) })
  }

  send(data: string) {
    this.sentMessages.push(data)
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
  return { deploymentStopped: status === 'CRASHED', id: 'deployment-1', status }
}

function subscribeToDeployment(client: ReturnType<typeof createTestClient>) {
  return client.subscribe({
    document: deploymentStatusSubscription,
    variables: { deploymentId: 'deployment-1' },
  })
}

const readSentMessages = (socket: ControlledWebSocket) =>
  socket.sentMessages.map((message) => parseMessage(message))

function readSocket() {
  const socket = sockets[0]
  if (socket === undefined) {
    throw new Error('Expected a controlled WebSocket.')
  }
  return socket
}

async function acknowledgeConnection(socket: ControlledWebSocket) {
  await vi.waitFor(() =>
    expect(readSentMessages(socket)).toContainEqual({ type: MessageType.ConnectionInit }),
  )
  socket.receive({ type: MessageType.ConnectionAck })
}

async function waitForSubscribe(socket: ControlledWebSocket) {
  return vi.waitFor(() => {
    const message = readSentMessages(socket).find((item) => item.type === MessageType.Subscribe)
    if (message?.type !== MessageType.Subscribe) {
      throw new Error('Expected a subscribe message.')
    }
    return message
  })
}

async function startSubscription(client: ReturnType<typeof createTestClient>) {
  const subscription = subscribeToDeployment(client)
  const next = subscription.events.next()
  const socket = readSocket()
  await acknowledgeConnection(socket)
  const request = await waitForSubscribe(socket)
  return { next, request, socket, subscription }
}

beforeEach(() => {
  sockets.length = 0
})

describe('Railway subscription client', () => {
  it('resolves readiness after it sends the subscription', async () => {
    const client = createTestClient()
    const subscription = subscribeToDeployment(client)
    const next = subscription.events.next()
    const socket = readSocket()
    let subscribed = false
    void subscription.subscribed.then(() => {
      subscribed = true
    })

    await vi.waitFor(() =>
      expect(readSentMessages(socket)).toContainEqual({ type: MessageType.ConnectionInit }),
    )
    expect(subscribed).toBe(false)
    socket.receive({ type: MessageType.ConnectionAck })
    await waitForSubscribe(socket)
    await expect(subscription.subscribed).resolves.toBeUndefined()

    await client.close()
    await expect(next).resolves.toEqual({ done: true, value: undefined })
  })

  it('sends the authorization header and yields controlled status events', async () => {
    const client = createTestClient()
    const { next, request, socket, subscription } = await startSubscription(client)
    socket.receive({
      id: request.id,
      payload: { data: { deployment: createDeploymentStatus() } },
      type: MessageType.Next,
    })
    await expect(next).resolves.toEqual({
      done: false,
      value: { deployment: createDeploymentStatus() },
    })
    const crashed = subscription.events.next()
    socket.receive({
      id: request.id,
      payload: { data: { deployment: createDeploymentStatus('CRASHED') } },
      type: MessageType.Next,
    })
    await expect(crashed).resolves.toEqual({
      done: false,
      value: { deployment: createDeploymentStatus('CRASHED') },
    })
    expect(socket.argument).toEqual({
      headers: { authorization: `Bearer ${testRailwayToken}` },
      protocols: 'graphql-transport-ws',
    })
    expect(request.payload).toEqual({
      query: print(deploymentStatusSubscription),
      variables: { deploymentId: 'deployment-1' },
    })
    const done = subscription.events.next()
    await client.close()
    expect(socket.closeCalls).toEqual([{ code: 1000, reason: 'Normal Closure' }])
    await expect(done).resolves.toEqual({ done: true, value: undefined })
  })

  it('receives silence when the WebSocket has no authorization header', async () => {
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
    await acknowledgeConnection(socket)
    await waitForSubscribe(socket)

    expect(socket.argument).toBe('graphql-transport-ws')
    expect(socket.readyState).toBe(ControlledWebSocket.OPEN)
    expect(settled).toBe(false)

    await client.dispose()
    await expect(next).resolves.toEqual({ done: true, value: undefined })
  })

  it('reports an upstream close and does not retry', async () => {
    const client = createTestClient()
    const { next, socket } = await startSubscription(client)

    socket.closeFromServer(1011, `Railway unavailable: ${testRailwayToken}`)

    await expect(next).rejects.toMatchObject({
      code: 1011,
      message: 'Railway subscription closed with code 1011: Railway unavailable: [REDACTED]',
      name: 'RailwaySubscriptionError',
    })
    expect(sockets).toHaveLength(1)
  })

  it('redacts a token in a GraphQL error', async () => {
    const client = createTestClient()
    const { next, request, socket } = await startSubscription(client)

    socket.receive({
      id: request.id,
      payload: [{ message: `Not Authorized: ${testRailwayToken}` }],
      type: MessageType.Error,
    })

    await expect(next).rejects.toMatchObject({
      message: 'Not Authorized: [REDACTED]',
      messages: ['Not Authorized: [REDACTED]'],
      name: 'RailwayGraphQLError',
    })
  })

  it('redacts a token in an upstream error event', async () => {
    const client = createTestClient()
    const { next, socket } = await startSubscription(client)

    socket.fail(testRailwayToken)
    socket.closeFromServer(1006, testRailwayToken)

    await expect(next).rejects.toMatchObject({
      message: 'Railway subscription failed: [REDACTED]',
      name: 'RailwaySubscriptionError',
    })
  })
})
