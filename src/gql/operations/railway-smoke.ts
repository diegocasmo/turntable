import { graphql } from 'gql.tada'

export const railwaySmokeQuery = graphql(`
  query RailwaySmoke($projectId: String!, $environmentId: String!) {
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
