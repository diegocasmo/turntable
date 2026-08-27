import { graphql, type ResultOf } from 'gql.tada'

export const selectionEnvironmentsQuery = graphql(`
  query SelectionEnvironments($projectId: String!, $first: Int, $after: String) {
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

export type SelectionEnvironmentsConnection = ResultOf<
  typeof selectionEnvironmentsQuery
>['project']['environments']
export type EnvironmentOption = SelectionEnvironmentsConnection['edges'][number]['node']
