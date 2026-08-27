import { z } from '@/zod'

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
const transitionalDeploymentStatuses = new Set<DeploymentStatus>([
  'BUILDING',
  'DEPLOYING',
  'INITIALIZING',
  'NEEDS_APPROVAL',
  'QUEUED',
  'REMOVING',
  'WAITING',
])

export const deploymentStatusSchema = z.string().transform((value) => {
  const result = knownDeploymentStatusSchema.safeParse(value)
  return result.success ? result.data : unknownDeploymentStatus
})

export type DeploymentStatus = z.infer<typeof deploymentStatusSchema>
export type DeploymentStatusTone = 'danger' | 'neutral' | 'positive' | 'progress'
type DeploymentStatusPresentation = Readonly<{
  label: string
  tone: DeploymentStatusTone
}>

const deploymentStatusPresentations: Record<DeploymentStatus, DeploymentStatusPresentation> = {
  BUILDING: { label: 'Building', tone: 'progress' },
  CRASHED: { label: 'Crashed', tone: 'danger' },
  DEPLOYING: { label: 'Deploying', tone: 'progress' },
  FAILED: { label: 'Failed', tone: 'danger' },
  INITIALIZING: { label: 'Initializing', tone: 'progress' },
  NEEDS_APPROVAL: { label: 'Needs approval', tone: 'progress' },
  QUEUED: { label: 'Queued', tone: 'progress' },
  REMOVED: { label: 'Removed', tone: 'neutral' },
  REMOVING: { label: 'Removing', tone: 'progress' },
  SKIPPED: { label: 'Skipped', tone: 'neutral' },
  SLEEPING: { label: 'Sleeping', tone: 'neutral' },
  SUCCESS: { label: 'Success', tone: 'positive' },
  WAITING: { label: 'Waiting', tone: 'progress' },
  unknown: { label: 'Unknown', tone: 'neutral' },
}

export function readDeploymentStatusPresentation(status: DeploymentStatus) {
  return deploymentStatusPresentations[status]
}

export function isDeploymentStatusTransitional(status: DeploymentStatus) {
  return transitionalDeploymentStatuses.has(status)
}
