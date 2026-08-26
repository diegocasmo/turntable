import { deploymentRemoveMutation } from '@/gql/operations/deployment-remove'
import { createRailwayClient } from '@/railway/client.server'
import { z } from '@/zod'

export async function spinDownRailwayDeployment(
  token: string,
  apiUrl: string,
  deploymentId: string,
  fetchRequest: (request: Request) => Promise<Response> = globalThis.fetch,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const result = await client.request({
    document: deploymentRemoveMutation,
    token,
    variables: { deploymentId },
  })

  return z.literal(true).safeParse(result.deploymentRemove).success
}
