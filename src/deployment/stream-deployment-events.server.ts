import { setTimeout as waitForTimeout } from 'node:timers/promises'
import { type DeploymentStreamEvent, readDeploymentStreamState } from '@/deployment/event-stream'
import { readRailwayCurrentDeployment } from '@/deployment/read-current-deployment.server'
import { readRailwayDeploymentStatus } from '@/deployment/read-deployment-status.server'
import type { DeploymentTarget } from '@/deployment/schema'
import {
  deploymentStatusSubscription,
  type RailwayDeploymentStatusResult,
} from '@/gql/operations/deployment-status-subscription'
import { createRailwaySubscriptionClient } from '@/railway/create-railway-subscription-client.server'
import { RailwayGraphQLError, RailwaySubscriptionError } from '@/railway/errors'
import type { TurntableSession } from '@/session/cookie.server'

export const deploymentStreamHeartbeatMilliseconds = 30_000
export const deploymentStreamTransportMilliseconds = 14 * 60 * 1_000

export class DeploymentStreamDeadlineError extends Error {
  constructor() {
    super('The deployment stream reached its transport deadline.')
  }
}

type StreamDeploymentEventsInput = Readonly<{
  apiUrl: string
  session: TurntableSession
  signal: AbortSignal
  target: DeploymentTarget
  webSocketUrl: string
}>

function subscribeToRailwayDeployment(deploymentId: string, token: string, webSocketUrl: string) {
  const client = createRailwaySubscriptionClient({ token, webSocketUrl })
  const subscription = client.subscribe<RailwayDeploymentStatusResult, { deploymentId: string }>({
    document: deploymentStatusSubscription,
    variables: { deploymentId },
  })

  return { ...subscription, close: () => client.close() }
}

const heartbeatEvent = { type: 'heartbeat' } satisfies DeploymentStreamEvent
const defaultDependencies = {
  createTimeoutSignal: (milliseconds: number) => AbortSignal.timeout(milliseconds),
  readCurrentDeployment: (
    token: string,
    apiUrl: string,
    target: DeploymentTarget,
    signal: AbortSignal,
  ) => readRailwayCurrentDeployment(token, apiUrl, target, globalThis.fetch, signal),
  readDeploymentStatus: (
    token: string,
    apiUrl: string,
    deploymentId: string,
    signal: AbortSignal,
  ) => readRailwayDeploymentStatus(token, apiUrl, deploymentId, globalThis.fetch, signal),
  subscribeToDeployment: subscribeToRailwayDeployment,
  waitForHeartbeat: (signal: AbortSignal) =>
    waitForTimeout(deploymentStreamHeartbeatMilliseconds, heartbeatEvent, { signal }),
}

type StreamDeploymentEventsDependencies = Readonly<typeof defaultDependencies>

class DeploymentStreamEndedError extends Error {
  constructor(readonly event: DeploymentStreamEvent | null) {
    super('The deployment stream ended.')
  }
}

function createStreamLifetime(
  requestSignal: AbortSignal,
  sessionMilliseconds: number,
  dependencies: StreamDeploymentEventsDependencies,
) {
  const sessionSignal = dependencies.createTimeoutSignal(sessionMilliseconds)
  const transportSignal = dependencies.createTimeoutSignal(deploymentStreamTransportMilliseconds)
  const signal = AbortSignal.any([requestSignal, sessionSignal, transportSignal])
  const ended = Promise.withResolvers<never>()
  const handleAbort = () => {
    if (requestSignal.aborted) ended.reject(new DeploymentStreamEndedError(null))
    else if (sessionSignal.aborted) {
      ended.reject(new DeploymentStreamEndedError({ type: 'session-expired' }))
    } else ended.reject(new DeploymentStreamDeadlineError())
  }

  if (signal.aborted) handleAbort()
  else signal.addEventListener('abort', handleAbort, { once: true })

  return {
    close: () => signal.removeEventListener('abort', handleAbort),
    ended: ended.promise,
    signal,
  }
}

function readNextStatus(iterator: AsyncIterator<RailwayDeploymentStatusResult>) {
  return iterator.next().then(
    (result) => ({ result, type: 'status' }) as const,
    (error: unknown) => ({ error, type: 'error' }) as const,
  )
}

function readFailureEvent(error: unknown): DeploymentStreamEvent | null {
  if (error instanceof RailwayGraphQLError) {
    if (error.isUnauthorized) return { type: 'session-expired' }
    if (error.isNotFound) return { type: 'gone' }
  }

  return null
}

export async function* streamRailwayDeploymentEvents(
  { apiUrl, session, signal: requestSignal, target, webSocketUrl }: StreamDeploymentEventsInput,
  dependencies: StreamDeploymentEventsDependencies = defaultDependencies,
): AsyncGenerator<DeploymentStreamEvent> {
  const sessionMilliseconds = Math.max(0, session.expiresAtUnixSeconds * 1_000 - Date.now())
  const lifetime = createStreamLifetime(requestSignal, sessionMilliseconds, dependencies)
  let subscription: ReturnType<typeof subscribeToRailwayDeployment> | undefined

  try {
    const deployment = await Promise.race([
      dependencies.readCurrentDeployment(session.token, apiUrl, target, lifetime.signal),
      lifetime.ended,
    ])
    if (deployment === null) {
      yield { data: null, type: 'snapshot' }
      return
    }

    subscription = dependencies.subscribeToDeployment(deployment.id, session.token, webSocketUrl)
    const iterator = subscription.events[Symbol.asyncIterator]()
    let nextStatus = readNextStatus(iterator)
    await Promise.race([subscription.subscribed, lifetime.ended])

    const snapshot = await Promise.race([
      dependencies.readDeploymentStatus(session.token, apiUrl, deployment.id, lifetime.signal),
      lifetime.ended,
    ])
    yield { data: snapshot, type: 'snapshot' }

    while (true) {
      const heartbeat = new AbortController()
      const result = await Promise.race([
        nextStatus,
        dependencies.waitForHeartbeat(heartbeat.signal),
        lifetime.ended,
      ]).finally(() => heartbeat.abort())

      if (result.type === 'heartbeat') {
        yield result
        continue
      }
      if (result.type === 'error') throw result.error
      if (result.result.done) throw new RailwaySubscriptionError(undefined)

      yield { data: readDeploymentStreamState(result.result.value.deployment), type: 'status' }
      nextStatus = readNextStatus(iterator)
    }
  } catch (error) {
    if (error instanceof DeploymentStreamEndedError) {
      if (error.event !== null) yield error.event
      return
    }

    const event = readFailureEvent(error)
    if (event !== null) yield event
    else throw error
  } finally {
    lifetime.close()
    await subscription?.close().catch(() => undefined)
  }
}

export async function* streamExpiredDeploymentSession(): AsyncGenerator<DeploymentStreamEvent> {
  yield { type: 'session-expired' }
}
