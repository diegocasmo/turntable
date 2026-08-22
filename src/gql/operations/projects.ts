export const projectsQuery = /* GraphQL */ `
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
`
