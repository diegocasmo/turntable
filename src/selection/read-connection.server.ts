import type { ResultOf } from 'gql.tada'
import type { environmentServicesQuery } from '@/gql/operations/environment-services'
import type { projectEnvironmentsQuery } from '@/gql/operations/project-environments'
import type { projectsQuery } from '@/gql/operations/projects'
import { RailwayResponseError } from '@/railway/errors'

export const railwayConnectionPageSize = 500

type RailwayConnection =
  | ResultOf<typeof projectsQuery>['projects']
  | ResultOf<typeof projectEnvironmentsQuery>['project']['environments']
  | ResultOf<typeof environmentServicesQuery>['environment']['serviceInstances']

type ConnectionNode<Connection extends RailwayConnection> = Connection['edges'][number]['node']

export async function readConnectionNodes<Connection extends RailwayConnection>(
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
