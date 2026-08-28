import type { EnvironmentsConnection } from '@/gql/operations/environment-list'
import type { EnvironmentServicesConnection } from '@/gql/operations/environment-services'
import type { ProjectsConnection } from '@/gql/operations/project-list'
import { RailwayResponseError } from '@/railway/errors'

export const railwayConnectionPageSize = 500

type RailwayConnection = EnvironmentsConnection | EnvironmentServicesConnection | ProjectsConnection

type ConnectionNode<Connection extends RailwayConnection> = Connection['edges'][number]['node']

export async function readAllConnectionNodes<Connection extends RailwayConnection>(
  readPage: (after: string | null) => Promise<Connection>,
) {
  const nodes: ConnectionNode<Connection>[] = []
  let after: string | null = null

  while (true) {
    const page = await readPage(after)
    nodes.push(...page.edges.map((edge) => edge.node))

    if (!page.pageInfo.hasNextPage) {
      return nodes
    }

    if (page.pageInfo.endCursor === null) {
      throw new RailwayResponseError()
    }

    after = page.pageInfo.endCursor
  }
}
