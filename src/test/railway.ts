import { vi } from 'vitest'
import type { RailwayDeployment } from '@/gql/operations/deployment-identity'
import type { RailwayEnvironment } from '@/gql/operations/environment-list'
import type { RailwayService } from '@/gql/operations/environment-services'
import type { ProjectsConnection, RailwayProject } from '@/gql/operations/project-list'
import type { SelectionEnvironment, SelectionProject } from '@/gql/operations/projects'
import { createJsonResponse } from '@/test/response'

export const testRailwayApiUrl = 'https://backboard.railway.test/graphql/v2'
export const testRailwayEnvironmentId = 'environment-1'
export const testRailwayProjectId = 'project-1'
export const testRailwayServiceId = 'service-1'
export const testRailwayToken = 'railway-token-that-must-not-leak'
export const testRailwayWorkspaceId = 'workspace-1'

type PageInfo = ProjectsConnection['pageInfo']

export function createRailwayEdge<Node>(node: Node) {
  return { node }
}

export function createRailwayPage<Node>(
  nodes: readonly Node[],
  pageInfo: PageInfo = { endCursor: null, hasNextPage: false },
) {
  return { edges: nodes.map(createRailwayEdge), pageInfo }
}

export function createRailwayProject(overrides: Partial<RailwayProject> = {}): RailwayProject {
  return {
    id: testRailwayProjectId,
    name: 'Turntable',
    workspace: { id: testRailwayWorkspaceId, name: 'Railway workspace' },
    ...overrides,
  }
}

export function createRailwayEnvironment(
  overrides: Partial<RailwayEnvironment> = {},
): RailwayEnvironment {
  return { id: testRailwayEnvironmentId, name: 'Production', ...overrides }
}

export function createRailwayService(overrides: Partial<RailwayService> = {}): RailwayService {
  return {
    id: testRailwayServiceId,
    latestDeployment: { id: 'deployment-1', status: 'SUCCESS' },
    name: 'Web',
    ...overrides,
  }
}

export function createSelectionEnvironment(
  overrides: Partial<SelectionEnvironment> = {},
): SelectionEnvironment {
  return {
    ...createRailwayEnvironment(),
    services: [createRailwayService()],
    ...overrides,
  }
}

export function createSelectionProject(
  overrides: Partial<SelectionProject> = {},
): SelectionProject {
  return {
    ...createRailwayProject(),
    environments: [createSelectionEnvironment()],
    ...overrides,
  }
}

export function createRailwayDeployment(
  overrides: Partial<RailwayDeployment> = {},
): RailwayDeployment {
  const deployment = {
    createdAt: '2026-08-25T12:00:00.000Z',
    id: 'deployment-1',
    status: 'SUCCESS',
  } satisfies { createdAt: string; id: string; status: 'SUCCESS' }

  return {
    ...deployment,
    ...overrides,
  }
}

export function createRailwayResponse<Data>(data: Data) {
  return { data }
}

export function createRailwayFetch(...bodies: readonly unknown[]) {
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

export function createRailwayTokenContext(...workspaceIds: readonly string[]) {
  return createRailwayResponse({
    apiToken: { workspaces: workspaceIds.map((id) => ({ id })) },
  })
}
