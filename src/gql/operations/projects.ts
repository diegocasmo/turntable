import { graphql } from 'gql.tada'

export const projectsQuery = graphql(`
  query Projects {
    projects {
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
    }
  }
`)
