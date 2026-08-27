import { apiTokenWorkspacesQuery } from '@/gql/operations/api-token-workspaces'
import { environmentServicesQuery } from '@/gql/operations/environment-services'
import {
  type ProjectEnvironmentsConnection,
  projectEnvironmentsQuery,
} from '@/gql/operations/project-environments'
import {
  projectHierarchyQuery,
  type SelectionEnvironment,
  type SelectionEnvironmentNode,
  type SelectionProject,
  type SelectionProjectNode,
} from '@/gql/operations/projects'
import { createRailwayClient } from '@/railway/client.server'
import {
  railwayConnectionPageSize,
  readAllConnectionNodes,
} from '@/selection/read-all-connection-nodes.server'

type FetchRequest = (request: Request) => Promise<Response>
type RailwayClient = ReturnType<typeof createRailwayClient>
type ProjectEnvironmentNode = ProjectEnvironmentsConnection['edges'][number]['node']

async function readRailwayEnvironment(
  client: RailwayClient,
  token: string,
  projectId: string,
  environment: SelectionEnvironmentNode | ProjectEnvironmentNode,
): Promise<SelectionEnvironment> {
  const { serviceInstances, ...option } = environment
  const services = await readAllConnectionNodes(serviceInstances, async (after) => {
    const page = await client.request({
      document: environmentServicesQuery,
      token,
      variables: {
        after,
        environmentId: environment.id,
        first: railwayConnectionPageSize,
        projectId,
      },
    })
    return page.environment.serviceInstances
  })

  return { ...option, services }
}

async function readRailwayProject(
  client: RailwayClient,
  token: string,
  project: SelectionProjectNode,
): Promise<SelectionProject> {
  const { environments: firstPage, ...option } = project
  const environments = await readAllConnectionNodes(firstPage, async (after) => {
    const page = await client.request({
      document: projectEnvironmentsQuery,
      token,
      variables: { after, first: railwayConnectionPageSize, projectId: project.id },
    })
    return page.project.environments
  })

  return {
    ...option,
    environments: await Promise.all(
      environments.map((environment) =>
        readRailwayEnvironment(client, token, project.id, environment),
      ),
    ),
  }
}

async function readRailwayWorkspace(client: RailwayClient, token: string, workspaceId: string) {
  const readPage = (after: string | null = null) =>
    client.request({
      document: projectHierarchyQuery,
      token,
      variables: { after, first: railwayConnectionPageSize, workspaceId },
    })
  const firstPage = await readPage()
  const projects = await readAllConnectionNodes(firstPage.projects, async (after) => {
    const page = await readPage(after)
    return page.projects
  })

  return Promise.all(projects.map((project) => readRailwayProject(client, token, project)))
}

export async function readRailwaySelectionHierarchy(
  token: string,
  apiUrl: string,
  fetchRequest: FetchRequest = globalThis.fetch,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const tokenContext = await client.request({
    document: apiTokenWorkspacesQuery,
    token,
    variables: {},
  })
  const workspaces = await Promise.all(
    tokenContext.apiToken.workspaces.map((workspace) =>
      readRailwayWorkspace(client, token, workspace.id),
    ),
  )

  return workspaces.flat()
}
