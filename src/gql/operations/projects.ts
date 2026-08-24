import { z } from 'zod'
import type { ProjectsQuery } from '@/gql/generated/operations'

export const projectsQuery = /* GraphQL */ `
  query Projects {
    projects {
      edges {
        node {
          id
          name
          primaryEnvironmentId
          workspace {
            id
            name
          }
        }
      }
    }
  }
`

export const projectsQuerySchema: z.ZodType<ProjectsQuery> = z.object({
  projects: z.object({
    edges: z.array(
      z.object({
        node: z.object({
          id: z.string(),
          name: z.string(),
          primaryEnvironmentId: z.string().nullable(),
          workspace: z.object({ id: z.string(), name: z.string() }).nullable(),
        }),
      }),
    ),
  }),
})
