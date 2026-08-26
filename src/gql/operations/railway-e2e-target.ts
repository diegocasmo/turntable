import { graphql } from 'gql.tada'

export const railwayE2ETargetQuery = graphql(`
  query RailwayE2ETarget($projectId: String!, $environmentId: String!) {
    project(id: $projectId) {
      id
      name
    }
    environment(id: $environmentId, projectId: $projectId) {
      id
      name
      projectId
      serviceInstances {
        edges {
          node {
            serviceId
            serviceName
          }
        }
      }
    }
  }
`)
