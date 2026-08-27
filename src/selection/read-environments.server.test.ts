import { describe, expect, it } from 'vitest'
import { readRailwayEnvironments } from '@/selection/read-environments.server'
import {
  createRailwayEnvironment,
  createRailwayFetch,
  createRailwayPage,
  createRailwayResponse,
  testRailwayApiUrl,
  testRailwayProjectId,
  testRailwayToken,
} from '@/test/railway'

describe('readRailwayEnvironments', () => {
  it('scopes the read to its project route', async () => {
    const environment = createRailwayEnvironment()
    const fetchRequest = createRailwayFetch(
      createRailwayResponse({ project: { environments: createRailwayPage([environment]) } }),
    )

    await expect(
      readRailwayEnvironments(
        testRailwayToken,
        testRailwayApiUrl,
        testRailwayProjectId,
        fetchRequest,
      ),
    ).resolves.toEqual([environment])
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toMatchObject({
      variables: { projectId: testRailwayProjectId },
    })
  })
})
