import type { RailwayDeploymentStatus } from '@/gql/operations/deployment-status-subscription'
import { deploymentStatusSchema } from '@/railway/deployment-status'

export function readDeploymentStreamState(deployment: RailwayDeploymentStatus) {
  return {
    id: deployment.id,
    status: deploymentStatusSchema.parse(deployment.status),
    deploymentStopped: deployment.deploymentStopped,
  }
}

export type DeploymentStreamState = ReturnType<typeof readDeploymentStreamState>

export type DeploymentStreamEvent =
  | Readonly<{ data: DeploymentStreamState | null; type: 'snapshot' }>
  | Readonly<{ data: DeploymentStreamState; type: 'status' }>
  | Readonly<{ type: 'gone' | 'heartbeat' | 'session-expired' }>
