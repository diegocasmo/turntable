import type { DeploymentStatus } from '@/railway/deployment-status'

export function formatDeploymentStatus(status: DeploymentStatus) {
  const words = status.replaceAll('_', ' ').toLowerCase()
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`
}
