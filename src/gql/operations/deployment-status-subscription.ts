import { graphql } from 'gql.tada'

export const deploymentStatusSubscription = graphql(`
  subscription DeploymentStatus($deploymentId: String!) {
    deployment(id: $deploymentId) {
      id
      status
      deploymentStopped
    }
  }
`)
