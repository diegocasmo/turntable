import type { DeploymentTarget } from '@/deployment/schema'
import { serviceInstanceDeployMutation } from '@/gql/operations/service-instance-deploy'
import { createRailwayClient } from '@/railway/client.server'
import { z } from '@/zod'

export async function spinUpRailwayDeployment(
  token: string,
  apiUrl: string,
  target: DeploymentTarget,
  fetchRequest: (request: Request) => Promise<Response> = globalThis.fetch,
) {
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest })
  const result = await client.request({
    document: serviceInstanceDeployMutation,
    token,
    variables: { environmentId: target.environmentId, serviceId: target.serviceId },
  })

  return z.string().min(1).parse(result.serviceInstanceDeployV2)
}
