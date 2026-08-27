import { describe, expect, it } from 'vitest'
import { readRailwayServiceActionState } from '@/deployment/read-service-action-state.server'
import {
  createRailwayDeployment,
  createRailwayFetch,
  createRailwayPage,
  createRailwayResponse,
  testRailwayApiUrl,
  testRailwayEnvironmentId,
  testRailwayProjectId,
  testRailwayServiceId,
  testRailwayToken,
} from '@/test/railway'

const target = {
  environmentId: testRailwayEnvironmentId,
  projectId: testRailwayProjectId,
  serviceId: testRailwayServiceId,
}

function readActionState(status: 'FAILED' | 'SUCCESS') {
  const fetchRequest = createRailwayFetch(
    createRailwayResponse({
      deployments: createRailwayPage([createRailwayDeployment({ status })]),
    }),
  )
  return readRailwayServiceActionState(testRailwayToken, testRailwayApiUrl, target, fetchRequest)
}

describe('Railway service action state', () => {
  it('allows spin down only for the same successful state as the detail view', async () => {
    await expect(readActionState('SUCCESS')).resolves.toEqual({ deploymentId: 'deployment-1' })
    await expect(readActionState('FAILED')).resolves.toEqual({ deploymentId: null })
  })

  it('does not offer spin down when the service has no deployment', async () => {
    const fetchRequest = createRailwayFetch(
      createRailwayResponse({ deployments: createRailwayPage([]) }),
    )

    await expect(
      readRailwayServiceActionState(testRailwayToken, testRailwayApiUrl, target, fetchRequest),
    ).resolves.toEqual({ deploymentId: null })
  })
})
