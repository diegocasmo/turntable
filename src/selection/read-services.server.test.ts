import { describe, expect, it } from 'vitest'
import { readRailwayServices } from '@/selection/read-services.server'
import {
  createRailwayFetch,
  createRailwayPage,
  createRailwayResponse,
  createRailwayService,
  testRailwayApiUrl,
  testRailwayEnvironmentId,
  testRailwayProjectId,
  testRailwayServiceId,
  testRailwayToken,
} from '@/test/railway'

function readServicesFrom(service: unknown) {
  const fetchRequest = createRailwayFetch(
    createRailwayResponse({ environment: { serviceInstances: createRailwayPage([service]) } }),
  )
  const result = readRailwayServices(
    testRailwayToken,
    testRailwayApiUrl,
    testRailwayProjectId,
    testRailwayEnvironmentId,
    fetchRequest,
  )

  return { fetchRequest, result }
}

describe('readRailwayServices', () => {
  it('reads each service with only its latest active deployment', async () => {
    const service = createRailwayService()
    const { fetchRequest, result } = readServicesFrom(service)

    await expect(result).resolves.toEqual([
      {
        deployment: service.latestDeployment,
        id: service.id,
        name: service.name,
      },
    ])
    expect(fetchRequest).toHaveBeenCalledOnce()
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toMatchObject({
      variables: {
        environmentId: testRailwayEnvironmentId,
        projectId: testRailwayProjectId,
      },
    })
  })

  it('returns no active deployment when Railway has no latest deployment', async () => {
    const service = createRailwayService({ latestDeployment: null })
    const { result } = readServicesFrom(service)

    await expect(result).resolves.toEqual([
      { deployment: null, id: service.id, name: service.name },
    ])
  })

  it('maps an unknown deployment status to the unknown badge state', async () => {
    const service = {
      id: testRailwayServiceId,
      latestDeployment: { id: 'deployment-new', status: 'NEW_STATUS' },
      name: 'Web',
    }
    const { result } = readServicesFrom(service)

    await expect(result).resolves.toEqual([
      {
        deployment: { id: 'deployment-new', status: 'unknown' },
        id: testRailwayServiceId,
        name: 'Web',
      },
    ])
  })
})
