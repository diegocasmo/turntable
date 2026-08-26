import { graphql, type ResultOf } from 'gql.tada'

export const deploymentStatusSubscription = graphql(`
  subscription DeploymentStatus($deploymentId: String!) {
    deployment(id: $deploymentId) {
      id
      status
      deploymentStopped
    }
  }
`)

export type RailwayDeploymentStatus = ResultOf<typeof deploymentStatusSubscription>['deployment']
export type RailwayDeploymentStatusResult = ResultOf<typeof deploymentStatusSubscription>
