import { describe, expect, it } from 'vitest'
import { RailwayGraphQLError } from '@/railway/errors'
import { readRailwayProject } from '@/selection/read-project.server'
import {
  createRailwayFetch,
  createRailwayResponse,
  testRailwayApiUrl,
  testRailwayProjectId,
  testRailwayToken,
} from '@/test/railway'

describe('readRailwayProject', () => {
  it('reads one project by its route ID', async () => {
    const project = { id: testRailwayProjectId, name: 'Turntable' }
    const fetchRequest = createRailwayFetch(createRailwayResponse({ project }))

    await expect(
      readRailwayProject(testRailwayToken, testRailwayApiUrl, testRailwayProjectId, fetchRequest),
    ).resolves.toEqual(project)
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toMatchObject({
      variables: { projectId: testRailwayProjectId },
    })
  })

  it('returns null only for an authoritative not-found result', async () => {
    const notFoundFetch = createRailwayFetch({ errors: [{ message: 'Project not found' }] })
    const failedFetch = createRailwayFetch({ errors: [{ message: 'Railway is unavailable' }] })

    await expect(
      readRailwayProject(testRailwayToken, testRailwayApiUrl, testRailwayProjectId, notFoundFetch),
    ).resolves.toBeNull()
    await expect(
      readRailwayProject(testRailwayToken, testRailwayApiUrl, testRailwayProjectId, failedFetch),
    ).rejects.toBeInstanceOf(RailwayGraphQLError)
  })
})
