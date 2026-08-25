import { graphql } from 'gql.tada'

export const apiTokenWorkspacesQuery = graphql(`
  query ApiTokenWorkspaces {
    apiToken {
      workspaces {
        id
      }
    }
  }
`)
