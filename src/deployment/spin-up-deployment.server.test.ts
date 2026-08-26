import { describe, expect, it, vi } from 'vitest'
import { spinUpRailwayDeployment } from '@/deployment/spin-up-deployment.server'
import { testRailwayApiUrl, testRailwayToken } from '@/test/railway'
import { createJsonResponse } from '@/test/response'

const target = { environmentId: 'environment-1', projectId: 'project-1', serviceId: 'service-1' }

describe('spin up Railway deployment', () => {
  it('returns the new deployment ID and sends the selected service', async () => {
    const fetchRequest = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({ data: { serviceInstanceDeployV2: 'new-deployment' } }),
      )
      .mockResolvedValueOnce(createJsonResponse({ data: { serviceInstanceDeployV2: '' } }))

    await expect(
      spinUpRailwayDeployment(testRailwayToken, testRailwayApiUrl, target, fetchRequest),
    ).resolves.toBe('new-deployment')
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toEqual({
      query: expect.any(String),
      variables: { environmentId: target.environmentId, serviceId: target.serviceId },
    })
    await expect(
      spinUpRailwayDeployment(testRailwayToken, testRailwayApiUrl, target, fetchRequest),
    ).rejects.toThrow()
  })
})
