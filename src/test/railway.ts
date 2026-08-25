import type { ResultOf } from 'gql.tada'
import type { environmentServicesQuery } from '@/gql/operations/environment-services'
import type { projectEnvironmentsQuery } from '@/gql/operations/project-environments'
import type { projectsQuery } from '@/gql/operations/projects'

export const testRailwayApiUrl = 'https://backboard.railway.test/graphql/v2'
export const testRailwayEnvironmentId = 'environment-1'
export const testRailwayProjectId = 'project-1'
export const testRailwayServiceId = 'service-1'
export const testRailwayToken = 'railway-token-that-must-not-leak'
export const testRailwayWorkspaceId = 'workspace-1'

type Project = ResultOf<typeof projectsQuery>['projects']['edges'][number]['node']
type Environment = ResultOf<
  typeof projectEnvironmentsQuery
>['project']['environments']['edges'][number]['node']
type Service = ResultOf<
  typeof environmentServicesQuery
>['environment']['serviceInstances']['edges'][number]['node']

type PageInfo = ResultOf<typeof projectsQuery>['projects']['pageInfo']

export function createRailwayEdge<Node>(node: Node) {
  return { node }
}

export function createRailwayPage<Node>(
  nodes: readonly Node[],
  pageInfo: PageInfo = { endCursor: null, hasNextPage: false },
) {
  return { edges: nodes.map(createRailwayEdge), pageInfo }
}

export function createRailwayProject(overrides: Partial<Project> = {}): Project {
  return {
    id: testRailwayProjectId,
    name: 'Turntable',
    primaryEnvironmentId: testRailwayEnvironmentId,
    workspace: { id: testRailwayWorkspaceId, name: 'Railway workspace' },
    ...overrides,
  }
}

export function createRailwayEnvironment(overrides: Partial<Environment> = {}): Environment {
  return { id: testRailwayEnvironmentId, name: 'Production', ...overrides }
}

export function createRailwayService(overrides: Partial<Service> = {}): Service {
  return { id: testRailwayServiceId, name: 'Web', ...overrides }
}

export function createRailwayResponse<Data>(data: Data) {
  return { data }
}
