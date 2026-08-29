import { describe, expect, it } from 'vitest'
import { spinDownRailwayDeployment } from '@/deployment/spin-down-deployment.server'
import { spinUpRailwayDeployment } from '@/deployment/spin-up-deployment.server'
import { RailwayGraphQLError } from '@/railway/errors'
import { createRailwayFetch, testRailwayApiUrl, testRailwayToken } from '@/test/railway'

const deploymentId = 'deployment-to-remove'
const target = { environmentId: 'environment-1', projectId: 'project-1', serviceId: 'service-1' }

describe('spin down Railway deployment', () => {
  it('removes the given deployment', async () => {
    const fetchRequest = createRailwayFetch({ data: { deploymentRemove: true } })

    await expect(
      spinDownRailwayDeployment(testRailwayToken, testRailwayApiUrl, deploymentId, fetchRequest),
    ).resolves.toBe(true)
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toMatchObject({
      variables: { deploymentId },
    })
  })

  it('rejects a false result', async () => {
    const fetchRequest = createRailwayFetch({ data: { deploymentRemove: false } })

    await expect(
      spinDownRailwayDeployment(testRailwayToken, testRailwayApiUrl, deploymentId, fetchRequest),
    ).resolves.toBe(false)
  })

  it('does not retry a GraphQL error', async () => {
    const fetchRequest = createRailwayFetch({
      errors: [{ message: 'Deployment cannot be removed' }],
    })

    await expect(
      spinDownRailwayDeployment(testRailwayToken, testRailwayApiUrl, deploymentId, fetchRequest),
    ).rejects.toBeInstanceOf(RailwayGraphQLError)
    expect(fetchRequest).toHaveBeenCalledOnce()
  })
})

describe('spin up Railway deployment', () => {
  it('returns and validates the new deployment ID', async () => {
    const fetchRequest = createRailwayFetch({ data: { serviceInstanceDeployV2: 'new-deployment' } })

    await expect(
      spinUpRailwayDeployment(testRailwayToken, testRailwayApiUrl, target, fetchRequest),
    ).resolves.toBe('new-deployment')
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toMatchObject({
      variables: { environmentId: target.environmentId, serviceId: target.serviceId },
    })
    await expect(
      spinUpRailwayDeployment(
        testRailwayToken,
        testRailwayApiUrl,
        target,
        createRailwayFetch({ data: { serviceInstanceDeployV2: '' } }),
      ),
    ).rejects.toThrow()
  })
})
