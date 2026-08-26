import { describe, expect, it, vi } from 'vitest'
import { spinUpRailwayDeployment } from '@/deployment/spin-up-deployment.server'
import { RailwayGraphQLError } from '@/railway/errors'
import { testRailwayApiUrl, testRailwayToken } from '@/test/railway'
import { createJsonResponse } from '@/test/response'

const target = { environmentId: 'environment-1', projectId: 'project-1', serviceId: 'service-1' }

function createFetch(response: Response) {
  return vi.fn(async (_request: Request) => response)
}

describe('spin up Railway deployment', () => {
  it('returns the new deployment ID and sends the selected service', async () => {
    const fetchRequest = createFetch(
      createJsonResponse({ data: { serviceInstanceDeployV2: 'new-deployment' } }),
    )

    await expect(
      spinUpRailwayDeployment(testRailwayToken, testRailwayApiUrl, target, fetchRequest),
    ).resolves.toBe('new-deployment')
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toEqual({
      query: expect.any(String),
      variables: { environmentId: target.environmentId, serviceId: target.serviceId },
    })
  })

  it('rejects an empty deployment ID', async () => {
    const fetchRequest = createFetch(createJsonResponse({ data: { serviceInstanceDeployV2: '' } }))

    await expect(
      spinUpRailwayDeployment(testRailwayToken, testRailwayApiUrl, target, fetchRequest),
    ).rejects.toThrow()
  })

  it('does not retry a GraphQL error', async () => {
    const fetchRequest = createFetch(
      createJsonResponse({ errors: [{ message: 'Service cannot deploy' }] }),
    )

    await expect(
      spinUpRailwayDeployment(testRailwayToken, testRailwayApiUrl, target, fetchRequest),
    ).rejects.toBeInstanceOf(RailwayGraphQLError)
    expect(fetchRequest).toHaveBeenCalledOnce()
  })
})
