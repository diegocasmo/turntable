import { graphql, type ResultOf } from 'gql.tada'

export const projectEnvironmentsQuery = graphql(`
  query ProjectEnvironments($projectId: String!, $first: Int, $after: String) {
    project(id: $projectId) {
      environments(first: $first, after: $after) {
        edges {
          node {
            id
            name
            serviceInstances(first: $first) {
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
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`)

export type ProjectEnvironmentsConnection = ResultOf<
  typeof projectEnvironmentsQuery
>['project']['environments']
