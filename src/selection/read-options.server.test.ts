import { describe, expect, it, vi } from 'vitest'
import { RailwayResponseError } from '@/railway/errors'
import { railwayConnectionPageSize } from '@/selection/read-all-connection-nodes.server'
import { readRailwayEnvironments } from '@/selection/read-environments.server'
import { readRailwayProjects } from '@/selection/read-projects.server'
import { readRailwayServices } from '@/selection/read-services.server'
import {
  createRailwayEnvironment,
  createRailwayPage,
  createRailwayProject,
  createRailwayResponse,
  createRailwayService,
  testRailwayApiUrl,
  testRailwayEnvironmentId,
  testRailwayProjectId,
  testRailwayToken,
} from '@/test/railway'
import { createJsonResponse } from '@/test/response'

function createRailwayFetch(...bodies: readonly unknown[]) {
  let responseIndex = 0

  return vi.fn(async (_request: Request) => {
    const body = bodies[responseIndex]
    responseIndex += 1

    if (body === undefined) {
      throw new Error('The test did not provide a Railway response.')
    }

    return createJsonResponse(body)
  })
}

describe('Railway selection reads', () => {
  it('reads every project page and returns only selection data', async () => {
    const firstProject = createRailwayProject()
    const secondProject = createRailwayProject({ id: 'project-2', name: 'Wheels' })
    const fetchRequest = createRailwayFetch(
      createRailwayResponse({
        projects: createRailwayPage([firstProject], {
          endCursor: 'project-cursor',
          hasNextPage: true,
        }),
      }),
      createRailwayResponse({ projects: createRailwayPage([secondProject]) }),
    )

    const projects = await readRailwayProjects(testRailwayToken, testRailwayApiUrl, fetchRequest)

    expect(projects).toEqual([firstProject, secondProject])
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toMatchObject({
      variables: { first: railwayConnectionPageSize },
    })
    await expect(fetchRequest.mock.calls[1]?.[0].json()).resolves.toMatchObject({
      variables: { after: 'project-cursor', first: railwayConnectionPageSize },
    })
  })

  it('reads project environments', async () => {
    const environment = createRailwayEnvironment()
    const fetchRequest = createRailwayFetch(
      createRailwayResponse({
        project: { environments: createRailwayPage([environment]) },
      }),
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
      variables: { first: railwayConnectionPageSize, projectId: testRailwayProjectId },
    })
  })

  it('reads environment services', async () => {
    const service = createRailwayService()
    const fetchRequest = createRailwayFetch(
      createRailwayResponse({
        environment: { serviceInstances: createRailwayPage([service]) },
      }),
    )

    await expect(
      readRailwayServices(
        testRailwayToken,
        testRailwayApiUrl,
        testRailwayProjectId,
        testRailwayEnvironmentId,
        fetchRequest,
      ),
    ).resolves.toEqual([service])
    await expect(fetchRequest.mock.calls[0]?.[0].json()).resolves.toMatchObject({
      variables: {
        environmentId: testRailwayEnvironmentId,
        first: railwayConnectionPageSize,
        projectId: testRailwayProjectId,
      },
    })
  })

  it('rejects a next page without a cursor', async () => {
    const fetchRequest = createRailwayFetch(
      createRailwayResponse({
        projects: createRailwayPage([createRailwayProject()], {
          endCursor: null,
          hasNextPage: true,
        }),
      }),
    )

    await expect(
      readRailwayProjects(testRailwayToken, testRailwayApiUrl, fetchRequest),
    ).rejects.toBeInstanceOf(RailwayResponseError)
    expect(fetchRequest).toHaveBeenCalledOnce()
  })
})
