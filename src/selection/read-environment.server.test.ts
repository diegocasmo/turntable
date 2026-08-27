import { describe, expect, it } from 'vitest'
import { RailwayGraphQLError } from '@/railway/errors'
import { readRailwayEnvironment } from '@/selection/read-environment.server'
import {
  createRailwayFetch,
  createRailwayResponse,
  testRailwayApiUrl,
  testRailwayEnvironmentId,
  testRailwayProjectId,
  testRailwayToken,
} from '@/test/railway'

describe('readRailwayEnvironment', () => {
  it('reads one environment within its project route', async () => {
    const environment = {
      id: testRailwayEnvironmentId,
      name: 'Production',
    }
    const fetchRequest = createRailwayFetch(createRailwayResponse({ environment }))

    await expect(
      readRailwayEnvironment(
        testRailwayToken,
        testRailwayApiUrl,
        testRailwayProjectId,
        testRailwayEnvironmentId,
        fetchRequest,
      ),
    ).resolves.toEqual(environment)
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toMatchObject({
      variables: {
        environmentId: testRailwayEnvironmentId,
        projectId: testRailwayProjectId,
      },
    })
  })

  it('returns null for not found', async () => {
    const notFoundFetch = createRailwayFetch({ errors: [{ message: 'Environment not found' }] })

    await expect(
      readRailwayEnvironment(
        testRailwayToken,
        testRailwayApiUrl,
        testRailwayProjectId,
        testRailwayEnvironmentId,
        notFoundFetch,
      ),
    ).resolves.toBeNull()
  })

  it('keeps other Railway failures as errors', async () => {
    const fetchRequest = createRailwayFetch({ errors: [{ message: 'Railway is unavailable' }] })

    await expect(
      readRailwayEnvironment(
        testRailwayToken,
        testRailwayApiUrl,
        testRailwayProjectId,
        testRailwayEnvironmentId,
        fetchRequest,
      ),
    ).rejects.toBeInstanceOf(RailwayGraphQLError)
  })
})
