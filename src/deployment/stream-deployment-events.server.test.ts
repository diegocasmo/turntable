import { describe, expect, it, vi } from 'vitest'
import type { DeploymentStreamState } from '@/deployment/event-stream'
import {
  DeploymentStreamDeadlineError,
  streamRailwayDeploymentEvents,
} from '@/deployment/stream-deployment-events.server'
import type { RailwayDeploymentStatusResult } from '@/gql/operations/deployment-status-subscription'
import { RailwayGraphQLError } from '@/railway/errors'

type Dependencies = NonNullable<Parameters<typeof streamRailwayDeploymentEvents>[1]>
const snapshot: DeploymentStreamState = { deploymentStopped: false, id: 'd', status: 'SUCCESS' }
const target = { environmentId: 'environment-1', projectId: 'project-1', serviceId: 'service-1' }
function createSetup(
  options: Readonly<{
    readDeploymentStatus?: Dependencies['readDeploymentStatus']
    subscribed?: Promise<void>
  }> = {},
) {
  const request = new AbortController()
  const sessionTimeout = new AbortController()
  const transportTimeout = new AbortController()
  const timeoutSignals = [sessionTimeout.signal, transportTimeout.signal]
  const channel = new TransformStream<RailwayDeploymentStatusResult>()
  const writer = channel.writable.getWriter()
  const close = vi.fn(async () => writer.close())
  const dependencies: Dependencies = {
    createTimeoutSignal: vi.fn(() => {
      const signal = timeoutSignals.shift()
      if (signal === undefined) throw new Error('Expected a timeout signal.')
      return signal
    }),
    readCurrentDeployment: vi.fn(async () => ({ id: snapshot.id })),
    readDeploymentStatus: options.readDeploymentStatus ?? vi.fn(async () => snapshot),
    subscribeToDeployment: vi.fn(() => ({
      close,
      events: (async function* () {
        for await (const event of channel.readable) yield event
      })(),
      subscribed: options.subscribed ?? Promise.resolve(),
    })),
    waitForHeartbeat: vi.fn(() => new Promise<never>(() => undefined)),
  }
  const events = streamRailwayDeploymentEvents(
    {
      apiUrl: 'https://backboard.railway.test/graphql/v2',
      session: { expiresAtUnixSeconds: 3_600, token: 'railway-token' },
      signal: request.signal,
      target,
      webSocketUrl: 'wss://backboard.railway.test/graphql/v2',
    },
    dependencies,
  )
  return { close, dependencies, events, request, sessionTimeout, transportTimeout, writer }
}
describe('deployment event stream', () => {
  it('subscribes before the snapshot and then drains a queued status', async () => {
    const subscribed = Promise.withResolvers<void>()
    const snapshotRead = Promise.withResolvers<DeploymentStreamState>()
    const readDeploymentStatus = vi.fn(() => snapshotRead.promise)
    const setup = createSetup({ readDeploymentStatus, subscribed: subscribed.promise })
    const first = setup.events.next()
    await vi.waitFor(() => expect(setup.dependencies.subscribeToDeployment).toHaveBeenCalledOnce())
    expect(readDeploymentStatus).not.toHaveBeenCalled()
    subscribed.resolve()
    await vi.waitFor(() => expect(readDeploymentStatus).toHaveBeenCalledOnce())
    const queued = setup.writer.write({
      deployment: { deploymentStopped: true, id: snapshot.id, status: 'CRASHED' },
    })
    snapshotRead.resolve(snapshot)
    await expect(first).resolves.toMatchObject({ value: { data: snapshot, type: 'snapshot' } })
    await queued
    await expect(setup.events.next()).resolves.toMatchObject({
      value: { data: { status: 'CRASHED' }, type: 'status' },
    })
    await setup.events.return(undefined)
  })
  it('returns a null snapshot when the service has never deployed', async () => {
    const setup = createSetup()
    vi.mocked(setup.dependencies.readCurrentDeployment).mockResolvedValue(null)
    await expect(setup.events.next()).resolves.toMatchObject({
      value: { data: null, type: 'snapshot' },
    })
    await expect(setup.events.next()).resolves.toMatchObject({ done: true })
    expect(setup.dependencies.subscribeToDeployment).not.toHaveBeenCalled()
  })

  it.each([
    [new RailwayGraphQLError(['Not Authorized']), 'session-expired'],
    [new RailwayGraphQLError(['Deployment not found']), 'gone'],
  ])('maps a terminal Railway failure', async (error, type) => {
    const setup = createSetup()
    vi.mocked(setup.dependencies.readCurrentDeployment).mockRejectedValue(error)
    await expect(setup.events.next()).resolves.toMatchObject({ value: { type } })
  })

  it('throws retryable failures and sends heartbeats', async () => {
    const failed = createSetup()
    vi.mocked(failed.dependencies.readCurrentDeployment).mockRejectedValue(new Error('failed'))
    await expect(failed.events.next()).rejects.toThrow('failed')
    const active = createSetup()
    await active.events.next()
    vi.mocked(active.dependencies.waitForHeartbeat).mockResolvedValue({ type: 'heartbeat' })
    await expect(active.events.next()).resolves.toMatchObject({ value: { type: 'heartbeat' } })
    expect(active.dependencies.waitForHeartbeat).toHaveBeenCalled()
    await active.events.return(undefined)
  })

  it('uses the transport, session, and request lifetimes', async () => {
    const deadline = createSetup()
    await deadline.events.next()
    deadline.transportTimeout.abort()
    await expect(deadline.events.next()).rejects.toBeInstanceOf(DeploymentStreamDeadlineError)
    const session = createSetup()
    await session.events.next()
    session.sessionTimeout.abort()
    await expect(session.events.next()).resolves.toMatchObject({
      value: { type: 'session-expired' },
    })
    await session.events.next()
    const request = createSetup()
    await request.events.next()
    request.request.abort()
    await expect(request.events.next()).resolves.toMatchObject({ done: true })
    const heartbeatSignal = vi.mocked(request.dependencies.waitForHeartbeat).mock.calls[0]?.[0]
    expect(heartbeatSignal?.aborted).toBe(true)
    expect(request.close).toHaveBeenCalledOnce()
  })
})
