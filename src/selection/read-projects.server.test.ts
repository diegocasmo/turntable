import { describe, expect, it } from 'vitest'
import { RailwayResponseError } from '@/railway/errors'
import { railwayConnectionPageSize } from '@/selection/read-all-connection-nodes.server'
import { readRailwayProjects } from '@/selection/read-projects.server'
import {
  createRailwayFetch,
  createRailwayPage,
  createRailwayProject,
  createRailwayResponse,
  createRailwayTokenContext,
  testRailwayApiUrl,
  testRailwayToken,
  testRailwayWorkspaceId,
} from '@/test/railway'

describe('readRailwayProjects', () => {
  it('reads every project page from every token workspace', async () => {
    const secondWorkspaceId = 'workspace-2'
    const firstProject = createRailwayProject()
    const secondProject = createRailwayProject({ id: 'project-2', name: 'Wheels' })
    const workspaceProject = createRailwayProject({
      id: 'project-3',
      workspace: { id: secondWorkspaceId, name: 'Second workspace' },
    })
    const fetchRequest = createRailwayFetch(
      createRailwayTokenContext(testRailwayWorkspaceId, secondWorkspaceId),
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

  it('passes cancellation to Railway and rejects an invalid page cursor', async () => {
    const controller = new AbortController()
    controller.abort()
    const cancelledFetch = createRailwayFetch(createRailwayTokenContext())

    await readRailwayProjects(
      testRailwayToken,
      testRailwayApiUrl,
      cancelledFetch,
      controller.signal,
    )
    expect(cancelledFetch.mock.calls[0]?.[0].signal.aborted).toBe(true)

    const invalidPageFetch = createRailwayFetch(
      createRailwayTokenContext(testRailwayWorkspaceId),
      createRailwayResponse({
        projects: createRailwayPage([], { endCursor: null, hasNextPage: true }),
      }),
    )
    await expect(
      readRailwayProjects(testRailwayToken, testRailwayApiUrl, invalidPageFetch),
    ).rejects.toBeInstanceOf(RailwayResponseError)
  })
})
