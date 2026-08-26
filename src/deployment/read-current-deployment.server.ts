import { type DeploymentTarget, deploymentTargetSchema } from '@/deployment/schema'
import { deploymentIdentityQuery } from '@/gql/operations/deployment-identity'
import { createRailwayClient } from '@/railway/client.server'
import { deploymentStatusSchema } from '@/railway/deployment-status'
import {
  railwayConnectionPageSize,
  readAllConnectionNodes,
} from '@/selection/read-all-connection-nodes.server'
import { z } from '@/zod'

type FetchRequest = (request: Request) => Promise<Response>

const createdAtSchema = z.iso.datetime({ offset: true }).transform(Date.parse)

function compareDeploymentCreatedAt(
  left: Readonly<{ createdAt: unknown }>,
  right: Readonly<{ createdAt: unknown }>,
) {
  return createdAtSchema.parse(right.createdAt) - createdAtSchema.parse(left.createdAt)
}

export async function readRailwayCurrentDeployment(
  token: string,
  apiUrl: string,
  target: DeploymentTarget,
  fetchRequest: FetchRequest = globalThis.fetch,
  signal?: AbortSignal,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const input = deploymentTargetSchema.parse(target)
  const readPage = (after: string | null = null) =>
    client.request({
      document: deploymentIdentityQuery,
      signal,
      token,
      variables: { after, first: railwayConnectionPageSize, input },
    })
  const firstPage = await readPage()
  const deployments = await readAllConnectionNodes(firstPage.deployments, async (after) => {
    const page = await readPage(after)
    return page.deployments
  })
  const current = [...deployments].sort(compareDeploymentCreatedAt)[0]

  return current ? { id: current.id, status: deploymentStatusSchema.parse(current.status) } : null
}
