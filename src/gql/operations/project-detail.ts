import { graphql } from 'gql.tada'

export const projectDetailQuery = graphql(`
  query ProjectDetail($projectId: String!) {
    project(id: $projectId) {
      id
      name
    }
  }
`)
