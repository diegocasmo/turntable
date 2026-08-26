import { graphql } from 'gql.tada'

export const serviceInstanceDeployMutation = graphql(`
  mutation ServiceInstanceDeploy($environmentId: String!, $serviceId: String!) {
    serviceInstanceDeployV2(environmentId: $environmentId, serviceId: $serviceId)
  }
`)
