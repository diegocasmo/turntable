import { vi } from 'vitest'
import type { RailwayEnvironment } from '@/gql/operations/environment-list'
import type { RailwayService } from '@/gql/operations/environment-services'
import type { ProjectsConnection, RailwayProject } from '@/gql/operations/project-list'
import { createJsonResponse } from '@/test/response'

export const testRailwayApiUrl = 'https://backboard.railway.test/graphql/v2'
export const testRailwayEnvironmentId = 'environment-1'
export const testRailwayProjectId = 'project-1'
export const testRailwayServiceId = 'service-1'
export const testRailwayToken = 'railway-token-that-must-not-leak'
export const testRailwayWorkspaceId = 'workspace-1'

type PageInfo = ProjectsConnection['pageInfo']

export function createRailwayPage<Node>(
  nodes: readonly Node[],
  pageInfo: PageInfo = { endCursor: null, hasNextPage: false },
) {
  return { edges: nodes.map((node) => ({ node })), pageInfo }
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
