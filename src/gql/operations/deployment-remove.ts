import { graphql } from 'gql.tada'

export const deploymentRemoveMutation = graphql(`
  mutation DeploymentRemove($deploymentId: String!) {
    deploymentRemove(id: $deploymentId)
  }
`)
