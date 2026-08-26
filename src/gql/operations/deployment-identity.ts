import { graphql, type ResultOf } from 'gql.tada'

export const deploymentIdentityQuery = graphql(`
  query DeploymentIdentity(
    $input: DeploymentListInput!
    $first: Int
    $after: String
  ) {
    deployments(input: $input, first: $first, after: $after) {
      edges {
        node {
          id
          createdAt
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`)

export type DeploymentsConnection = ResultOf<typeof deploymentIdentityQuery>['deployments']
export type RailwayDeployment = DeploymentsConnection['edges'][number]['node']
