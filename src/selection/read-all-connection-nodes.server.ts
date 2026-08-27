import type { EnvironmentServicesConnection } from '@/gql/operations/environment-services'
import type { SelectionEnvironmentsConnection as ScopedSelectionEnvironmentsConnection } from '@/gql/operations/selection-environments'
import type { SelectionProjectsConnection as ScopedSelectionProjectsConnection } from '@/gql/operations/selection-projects'
import { RailwayResponseError } from '@/railway/errors'

export const railwayConnectionPageSize = 500

type RailwayConnection =
  | ScopedSelectionEnvironmentsConnection
  | EnvironmentServicesConnection
  | ScopedSelectionProjectsConnection

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
