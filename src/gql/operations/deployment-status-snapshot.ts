import { graphql } from 'gql.tada'

export const deploymentStatusSnapshotQuery = graphql(`
  query DeploymentStatusSnapshot($deploymentId: String!) {
    deployment(id: $deploymentId) {
      id
      status
      deploymentStopped
    }
  }
`)
