import { z } from 'zod'
import type { RailwaySmokeQuery } from '@/gql/generated/operations'

export const railwaySmokeQuery = /* GraphQL */ `
  query RailwaySmoke($projectId: String!, $environmentId: String!) {
    project(id: $projectId) {
      id
      name
    }
    environment(id: $environmentId, projectId: $projectId) {
      id
      name
      projectId
      serviceInstances {
        edges {
          node {
            serviceId
            serviceName
          }
        }
      }
    }
  }
`

export const railwaySmokeQuerySchema: z.ZodType<RailwaySmokeQuery> = z.object({
  environment: z.object({
    id: z.string(),
    name: z.string(),
    projectId: z.string(),
    serviceInstances: z.object({
      edges: z.array(
        z.object({ node: z.object({ serviceId: z.string(), serviceName: z.string() }) }),
      ),
    }),
  }),
  project: z.object({ id: z.string(), name: z.string() }),
})
