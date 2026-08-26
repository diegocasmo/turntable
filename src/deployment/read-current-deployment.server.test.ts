import { describe, expect, it, vi } from 'vitest'
import { readRailwayCurrentDeployment } from '@/deployment/read-current-deployment.server'
import { railwayConnectionPageSize } from '@/selection/read-all-connection-nodes.server'
import {
  createRailwayDeployment,
  createRailwayPage,
  createRailwayResponse,
  testRailwayApiUrl,
  testRailwayEnvironmentId,
  testRailwayProjectId,
  testRailwayServiceId,
  testRailwayToken,
} from '@/test/railway'
import { createJsonResponse } from '@/test/response'

const target = {
  environmentId: testRailwayEnvironmentId,
  projectId: testRailwayProjectId,
  serviceId: testRailwayServiceId,
}

function createRailwayFetch(...pages: unknown[]) {
  return vi.fn(async (_request: Request) =>
    createJsonResponse(createRailwayResponse({ deployments: pages.shift() })),
  )
}

function readCurrent(fetchRequest: ReturnType<typeof createRailwayFetch>, input = target) {
  return readRailwayCurrentDeployment(testRailwayToken, testRailwayApiUrl, input, fetchRequest)
}

describe('Railway deployment identity', () => {
  it('returns one deployment and sends only the stable target', async () => {
    const deployment = createRailwayDeployment()
    const fetchRequest = createRailwayFetch(createRailwayPage([deployment]))
    const configLikeTarget = { ...target, token: testRailwayToken }

    await expect(readCurrent(fetchRequest, configLikeTarget)).resolves.toEqual({
      id: deployment.id,
    })
    const request = fetchRequest.mock.calls[0]?.[0]
    await expect(request?.clone().text()).resolves.not.toContain(testRailwayToken)
    await expect(request?.json()).resolves.toMatchObject({
      variables: { after: null, first: railwayConnectionPageSize, input: target },
    })
  })

  it('reads every page and sorts an unordered list', async () => {
    const oldest = createRailwayDeployment({ createdAt: '2026-08-23T12:00:00.000Z' })
    const middle = createRailwayDeployment({ createdAt: '2026-08-24T12:00:00.000Z' })
    const newest = createRailwayDeployment({
      createdAt: '2026-08-25T12:00:00.000Z',
      id: 'deployment-newest',
    })
    const fetchRequest = createRailwayFetch(
      createRailwayPage([middle, oldest], { endCursor: 'next-page', hasNextPage: true }),
      createRailwayPage([newest]),
    )

    await expect(readCurrent(fetchRequest)).resolves.toEqual({ id: newest.id })
    await expect(fetchRequest.mock.calls[1]?.[0].json()).resolves.toMatchObject({
      variables: { after: 'next-page' },
    })
  })

  it('returns null when the service has no deployment', async () => {
    const fetchRequest = createRailwayFetch(createRailwayPage([]))
    await expect(readCurrent(fetchRequest)).resolves.toBeNull()
  })
})
