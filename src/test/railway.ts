import type { RailwayDeployment } from '@/gql/operations/deployment-identity'
import type { ServiceOption } from '@/gql/operations/environment-services'
import type { EnvironmentOption } from '@/gql/operations/project-environments'
import type { ProjectOption, ProjectsConnection } from '@/gql/operations/projects'

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

export function createRailwayProject(overrides: Partial<ProjectOption> = {}): ProjectOption {
  return {
    id: testRailwayProjectId,
    name: 'Turntable',
    workspace: { id: testRailwayWorkspaceId, name: 'Railway workspace' },
    ...overrides,
  }
}

export function createRailwayEnvironment(
  overrides: Partial<EnvironmentOption> = {},
): EnvironmentOption {
  return { id: testRailwayEnvironmentId, name: 'Production', ...overrides }
}

export function createRailwayService(overrides: Partial<ServiceOption> = {}): ServiceOption {
  return { id: testRailwayServiceId, name: 'Web', ...overrides }
}

export function createRailwayDeployment(
  overrides: Partial<RailwayDeployment> = {},
): RailwayDeployment {
  return {
    createdAt: '2026-08-25T12:00:00.000Z',
    id: 'deployment-1',
    status: 'SUCCESS',
    ...overrides,
  }
}

export function createRailwayResponse<Data>(data: Data) {
  return { data }
}
