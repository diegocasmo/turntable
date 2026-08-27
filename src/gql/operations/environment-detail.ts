import { graphql } from 'gql.tada'

export const environmentDetailQuery = graphql(`
  query EnvironmentDetail($projectId: String!, $environmentId: String!) {
    environment(id: $environmentId, projectId: $projectId) {
      id
      name
    }
  }
`)
