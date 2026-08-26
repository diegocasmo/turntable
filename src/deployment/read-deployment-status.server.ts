import { readDeploymentStreamState } from '@/deployment/event-stream'
import { deploymentStatusSnapshotQuery } from '@/gql/operations/deployment-status-snapshot'
import { createRailwayClient } from '@/railway/client.server'

export async function readRailwayDeploymentStatus(
  token: string,
  apiUrl: string,
  deploymentId: string,
  fetchRequest: (request: Request) => Promise<Response> = globalThis.fetch,
  signal?: AbortSignal,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const result = await client.request({
    document: deploymentStatusSnapshotQuery,
    signal,
    token,
    variables: { deploymentId },
  })

  return readDeploymentStreamState(result.deployment)
}
