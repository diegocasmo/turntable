import { graphql, type ResultOf } from 'gql.tada'

export const environmentServicesQuery = graphql(`
  query EnvironmentServices(
    $projectId: String!
    $environmentId: String!
    $first: Int
    $after: String
  ) {
    environment(id: $environmentId, projectId: $projectId) {
      serviceInstances(first: $first, after: $after) {
        edges {
          node {
            id: serviceId
            name: serviceName
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`)

export type EnvironmentServicesConnection = ResultOf<
  typeof environmentServicesQuery
>['environment']['serviceInstances']
export type ServiceOption = EnvironmentServicesConnection['edges'][number]['node']
