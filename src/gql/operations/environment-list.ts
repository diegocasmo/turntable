import { graphql, type ResultOf } from 'gql.tada'

export const environmentsQuery = graphql(`
  query Environments($projectId: String!, $first: Int, $after: String) {
    project(id: $projectId) {
      environments(first: $first, after: $after) {
        edges {
          node {
            id
            name
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

export type EnvironmentsConnection = ResultOf<typeof environmentsQuery>['project']['environments']
export type RailwayEnvironment = EnvironmentsConnection['edges'][number]['node']
