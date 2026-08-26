import { describe, expect, it, vi } from 'vitest'
import { spinDownRailwayDeployment } from '@/deployment/spin-down-deployment.server'
import { RailwayGraphQLError } from '@/railway/errors'
import { testRailwayApiUrl, testRailwayToken } from '@/test/railway'
import { createJsonResponse } from '@/test/response'

const deploymentId = 'deployment-to-remove'

function createFetch(response: Response) {
  return vi.fn(async (_request: Request) => response)
}

describe('spin down Railway deployment', () => {
  it('removes the given deployment', async () => {
    const fetchRequest = createFetch(createJsonResponse({ data: { deploymentRemove: true } }))

    await expect(
      spinDownRailwayDeployment(testRailwayToken, testRailwayApiUrl, deploymentId, fetchRequest),
    ).resolves.toBe(true)
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toMatchObject({
      variables: { deploymentId },
    })
  })

  it('rejects a false result', async () => {
    const fetchRequest = createFetch(createJsonResponse({ data: { deploymentRemove: false } }))

    await expect(
      spinDownRailwayDeployment(testRailwayToken, testRailwayApiUrl, deploymentId, fetchRequest),
    ).resolves.toBe(false)
  })

  it('does not retry a GraphQL error', async () => {
    const fetchRequest = createFetch(
      createJsonResponse({ errors: [{ message: 'Deployment cannot be removed' }] }),
    )

    await expect(
      spinDownRailwayDeployment(testRailwayToken, testRailwayApiUrl, deploymentId, fetchRequest),
    ).rejects.toBeInstanceOf(RailwayGraphQLError)
    expect(fetchRequest).toHaveBeenCalledOnce()
  })
})
