import { graphql } from 'gql.tada'

export const projectEnvironmentsQuery = graphql(`
  query ProjectEnvironments($projectId: String!, $first: Int, $after: String) {
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
