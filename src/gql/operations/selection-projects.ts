import { graphql, type ResultOf } from 'gql.tada'

export const selectionProjectsQuery = graphql(`
  query SelectionProjects($workspaceId: String!, $first: Int, $after: String) {
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

export type SelectionProjectsConnection = ResultOf<typeof selectionProjectsQuery>['projects']
export type ProjectOption = SelectionProjectsConnection['edges'][number]['node']
