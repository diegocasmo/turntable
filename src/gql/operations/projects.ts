import { graphql } from 'gql.tada'

export const projectsQuery = graphql(`
  query Projects($first: Int, $after: String) {
    projects(first: $first, after: $after) {
      edges {
        node {
          id
          name
          primaryEnvironmentId
          workspace {
            id
            name
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`)
