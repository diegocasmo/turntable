import { z } from 'zod'

const knownDeploymentStatusSchema = z.enum([
  'BUILDING',
  'CRASHED',
  'DEPLOYING',
  'FAILED',
  'INITIALIZING',
  'NEEDS_APPROVAL',
  'QUEUED',
  'REMOVED',
  'REMOVING',
  'SKIPPED',
  'SLEEPING',
  'SUCCESS',
  'WAITING',
])
const unknownDeploymentStatus: 'unknown' = 'unknown'

export const deploymentStatusSchema = z.string().transform((value) => {
  const result = knownDeploymentStatusSchema.safeParse(value)
  return result.success ? result.data : unknownDeploymentStatus
})

export type DeploymentStatus = z.infer<typeof deploymentStatusSchema>
const deploymentStatusLabels: Record<DeploymentStatus, string> = {
  BUILDING: 'Building',
  CRASHED: 'Crashed',
  DEPLOYING: 'Deploying',
  FAILED: 'Failed',
  INITIALIZING: 'Initializing',
  NEEDS_APPROVAL: 'Needs approval',
  QUEUED: 'Queued',
  REMOVED: 'Removed',
  REMOVING: 'Removing',
  SKIPPED: 'Skipped',
  SLEEPING: 'Sleeping',
  SUCCESS: 'Success',
  WAITING: 'Waiting',
  unknown: 'Unknown',
}

export const formatDeploymentStatus = (status: DeploymentStatus) => deploymentStatusLabels[status]
