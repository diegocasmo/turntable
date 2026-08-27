import { readRailwayCurrentDeployment } from '@/deployment/read-current-deployment.server'
import type { DeploymentTarget } from '@/deployment/schema'

type FetchRequest = (request: Request) => Promise<Response>

export async function readRailwayServiceActionState(
  token: string,
  apiUrl: string,
  target: DeploymentTarget,
  fetchRequest: FetchRequest = globalThis.fetch,
  signal?: AbortSignal,
) {
  const current = await readRailwayCurrentDeployment(token, apiUrl, target, fetchRequest, signal)
  return { deploymentId: current?.status === 'SUCCESS' ? current.id : null }
}
