import { graphql, type ResultOf } from 'gql.tada'

export const selectionHierarchyQuery = graphql(`
  query SelectionHierarchy($workspaceId: String!, $first: Int, $after: String) {
    projects(workspaceId: $workspaceId, first: $first, after: $after) {
      edges {
        node {
          id
          name
          workspace {
            id
            name
          }
          environments(first: $first) {
            edges {
              node {
                id
                name
                serviceInstances(first: $first) {
                  edges {
                    node {
                      id: serviceId
                      name: serviceName
                    }
                  }
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                }
              }
            }
            pageInfo {
              endCursor
              hasNextPage
            }
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

export type SelectionProjectsConnection = ResultOf<typeof selectionHierarchyQuery>['projects']
export type SelectionProjectNode = SelectionProjectsConnection['edges'][number]['node']
export type SelectionEnvironmentsConnection = SelectionProjectNode['environments']
export type SelectionEnvironmentNode = SelectionEnvironmentsConnection['edges'][number]['node']
export type SelectionServicesConnection = SelectionEnvironmentNode['serviceInstances']

export type ProjectOption = Omit<SelectionProjectNode, 'environments'>
export type EnvironmentOption = Omit<SelectionEnvironmentNode, 'serviceInstances'>
export type ServiceOption = SelectionEnvironmentNode['serviceInstances']['edges'][number]['node']
export type SelectionEnvironment = EnvironmentOption &
  Readonly<{ services: readonly ServiceOption[] }>
export type SelectionProject = ProjectOption &
  Readonly<{ environments: readonly SelectionEnvironment[] }>
