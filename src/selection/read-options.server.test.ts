import { describe, expect, it, vi } from 'vitest'
import type { SelectionEnvironmentNode, SelectionProjectNode } from '@/gql/operations/projects'
import { RailwayResponseError } from '@/railway/errors'
import { readRailwaySelectionHierarchy } from '@/selection/read-selection-hierarchy.server'
import {
  createRailwayEnvironment,
  createRailwayPage,
  createRailwayProject,
  createRailwayResponse,
  createRailwayService,
  createSelectionEnvironment,
  createSelectionProject,
  testRailwayApiUrl,
  testRailwayToken,
  testRailwayWorkspaceId,
} from '@/test/railway'
import { createJsonResponse } from '@/test/response'

function createRailwayFetch(...bodies: readonly unknown[]) {
  let responseIndex = 0
  return vi.fn(async (_request: Request) => {
    const body = bodies[responseIndex++]
    if (body === undefined) throw new Error('The test did not provide a Railway response.')
    return createJsonResponse(body)
  })
}

function createTokenContext(...workspaceIds: readonly string[]) {
  return createRailwayResponse({
    apiToken: { workspaces: workspaceIds.map((id) => ({ id })) },
  })
}

function createHierarchyEnvironment(
  overrides: Partial<SelectionEnvironmentNode> = {},
): SelectionEnvironmentNode {
  return {
    ...createRailwayEnvironment(),
    serviceInstances: createRailwayPage([createRailwayService()]),
    ...overrides,
  }
}

function createHierarchyProject(
  overrides: Partial<SelectionProjectNode> = {},
): SelectionProjectNode {
  return {
    ...createRailwayProject(),
    environments: createRailwayPage([createHierarchyEnvironment()]),
    ...overrides,
  }
}

describe('Railway selection hierarchy', () => {
  it('reads every choice from every workspace', async () => {
    const secondWorkspace = { id: 'workspace-2', name: 'Second workspace' }
    const secondService = createRailwayService({ id: 'service-2', name: 'Worker' })
    const secondEnvironment = createHierarchyEnvironment({
      id: 'environment-2',
      name: 'Staging',
    })
    const firstProject = createHierarchyProject({
      environments: createRailwayPage(
        [
          createHierarchyEnvironment({
            serviceInstances: createRailwayPage([createRailwayService()], {
              endCursor: 'service-cursor',
              hasNextPage: true,
            }),
          }),
        ],
        { endCursor: 'environment-cursor', hasNextPage: true },
      ),
    })
    const secondProject = createHierarchyProject({ id: 'project-2', name: 'Wheels' })
    const workspaceProject = createHierarchyProject({ id: 'project-3', workspace: secondWorkspace })
    const fetchRequest = createRailwayFetch(
      createTokenContext(testRailwayWorkspaceId, secondWorkspace.id),
      createRailwayResponse({
        projects: createRailwayPage([firstProject], {
          endCursor: 'project-cursor',
          hasNextPage: true,
        }),
      }),
      createRailwayResponse({ projects: createRailwayPage([workspaceProject]) }),
      createRailwayResponse({ projects: createRailwayPage([secondProject]) }),
      createRailwayResponse({
        project: { environments: createRailwayPage([secondEnvironment]) },
      }),
      createRailwayResponse({
        environment: { serviceInstances: createRailwayPage([secondService]) },
      }),
    )

    await expect(
      readRailwaySelectionHierarchy(testRailwayToken, testRailwayApiUrl, fetchRequest),
    ).resolves.toEqual([
      createSelectionProject({
        environments: [
          createSelectionEnvironment({ services: [createRailwayService(), secondService] }),
          createSelectionEnvironment({ id: 'environment-2', name: 'Staging' }),
        ],
      }),
      createSelectionProject({ id: 'project-2', name: 'Wheels' }),
      createSelectionProject({ id: 'project-3', workspace: secondWorkspace }),
    ])
    for (const [index, after] of [
      [3, 'project-cursor'],
      [4, 'environment-cursor'],
      [5, 'service-cursor'],
    ] as const) {
      await expect(fetchRequest.mock.calls[index]?.[0].json()).resolves.toMatchObject({
        variables: { after },
      })
    }
  })

  it('rejects a next page without a cursor', async () => {
    const fetchRequest = createRailwayFetch(
      createTokenContext(testRailwayWorkspaceId),
      createRailwayResponse({
        projects: createRailwayPage([], { endCursor: null, hasNextPage: true }),
      }),
    )

    await expect(
      readRailwaySelectionHierarchy(testRailwayToken, testRailwayApiUrl, fetchRequest),
    ).rejects.toBeInstanceOf(RailwayResponseError)
  })
})
