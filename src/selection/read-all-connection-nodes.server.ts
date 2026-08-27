import type { EnvironmentsConnection } from '@/gql/operations/environment-list'
import type { EnvironmentServicesConnection } from '@/gql/operations/environment-services'
import type { ProjectsConnection } from '@/gql/operations/project-list'
import { RailwayResponseError } from '@/railway/errors'

export const railwayConnectionPageSize = 500

type RailwayConnection = EnvironmentsConnection | EnvironmentServicesConnection | ProjectsConnection

type ConnectionNode<Connection extends RailwayConnection> = Connection['edges'][number]['node']

export async function readAllConnectionNodes<Connection extends RailwayConnection>(
  firstPage: Connection,
  readNextPage: (after: string) => Promise<Connection>,
) {
  const nodes: ConnectionNode<Connection>[] = []
  let page = firstPage

  while (true) {
    nodes.push(...page.edges.map((edge) => edge.node))

    if (!page.pageInfo.hasNextPage) {
      return nodes
    }

    const { endCursor } = page.pageInfo

    if (endCursor === null) {
      throw new RailwayResponseError()
    }

    page = await readNextPage(endCursor)
  }
}
