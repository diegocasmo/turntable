import { graphql } from 'gql.tada'

export const environmentDetailQuery = graphql(`
  query EnvironmentDetail($environmentId: String!) {
    environment(id: $environmentId) {
      id
      name
      projectId
    }
  }
`)
