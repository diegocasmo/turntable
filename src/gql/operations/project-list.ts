import { graphql, type ResultOf } from 'gql.tada'

export const projectsQuery = graphql(`
  query Projects($workspaceId: String!, $first: Int, $after: String) {
    projects(workspaceId: $workspaceId, first: $first, after: $after) {
      edges {
        node {
          id
          name
          workspace {
            id
            name
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`)

export type ProjectsConnection = ResultOf<typeof projectsQuery>['projects']
export type RailwayProject = ProjectsConnection['edges'][number]['node']
