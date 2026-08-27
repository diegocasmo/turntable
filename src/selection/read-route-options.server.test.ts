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
  testRailwayWorkspaceId,
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

function createTokenContext(...workspaceIds: readonly string[]) {
  return createRailwayResponse({
    apiToken: { workspaces: workspaceIds.map((id) => ({ id })) },
  })
}

describe('Railway route selection reads', () => {
  it('reads every project page from every token workspace', async () => {
    const secondWorkspaceId = 'workspace-2'
    const firstProject = createRailwayProject()
    const secondProject = createRailwayProject({ id: 'project-2', name: 'Wheels' })
    const workspaceProject = createRailwayProject({
      id: 'project-3',
      workspace: { id: secondWorkspaceId, name: 'Second workspace' },
    })
    const fetchRequest = createRailwayFetch(
      createTokenContext(testRailwayWorkspaceId, secondWorkspaceId),
      createRailwayResponse({
        projects: createRailwayPage([firstProject], {
          endCursor: 'project-cursor',
          hasNextPage: true,
        }),
      }),
      createRailwayResponse({ projects: createRailwayPage([workspaceProject]) }),
      createRailwayResponse({ projects: createRailwayPage([secondProject]) }),
    )

    await expect(
      readRailwayProjects(testRailwayToken, testRailwayApiUrl, fetchRequest),
    ).resolves.toEqual([firstProject, secondProject, workspaceProject])
    await expect(fetchRequest.mock.calls[1]?.[0].json()).resolves.toMatchObject({
      variables: { first: railwayConnectionPageSize, workspaceId: testRailwayWorkspaceId },
    })
    await expect(fetchRequest.mock.calls[2]?.[0].json()).resolves.toMatchObject({
      variables: { first: railwayConnectionPageSize, workspaceId: secondWorkspaceId },
    })
    await expect(fetchRequest.mock.calls[3]?.[0].json()).resolves.toMatchObject({
      variables: { after: 'project-cursor' },
    })
  })

  it('scopes environment and service reads to their route parents', async () => {
    const environment = createRailwayEnvironment()
    const service = createRailwayService()
    const fetchRequest = createRailwayFetch(
      createRailwayResponse({ project: { environments: createRailwayPage([environment]) } }),
      createRailwayResponse({
        environment: { serviceInstances: createRailwayPage([service]) },
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
      variables: { projectId: testRailwayProjectId },
    })
    await expect(fetchRequest.mock.calls[1]?.[0].json()).resolves.toMatchObject({
      variables: {
        environmentId: testRailwayEnvironmentId,
        projectId: testRailwayProjectId,
      },
    })
  })

  it('passes cancellation to Railway and rejects an invalid page cursor', async () => {
    const controller = new AbortController()
    controller.abort()
    const cancelledFetch = createRailwayFetch(createTokenContext())

    await readRailwayProjects(
      testRailwayToken,
      testRailwayApiUrl,
      cancelledFetch,
      controller.signal,
    )
    expect(cancelledFetch.mock.calls[0]?.[0].signal.aborted).toBe(true)

    const invalidPageFetch = createRailwayFetch(
      createTokenContext(testRailwayWorkspaceId),
      createRailwayResponse({
        projects: createRailwayPage([], { endCursor: null, hasNextPage: true }),
      }),
    )
    await expect(
      readRailwayProjects(testRailwayToken, testRailwayApiUrl, invalidPageFetch),
    ).rejects.toBeInstanceOf(RailwayResponseError)
  })
})
