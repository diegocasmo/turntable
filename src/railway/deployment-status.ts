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
  indicator: 'activity' | 'attention' | 'waiting' | null
  label: string
  tone: DeploymentStatusTone
}>

const deploymentStatusPresentations: Record<DeploymentStatus, DeploymentStatusPresentation> = {
  BUILDING: { indicator: 'activity', label: 'Building', tone: 'progress' },
  CRASHED: { indicator: null, label: 'Crashed', tone: 'danger' },
  DEPLOYING: { indicator: 'activity', label: 'Deploying', tone: 'progress' },
  FAILED: { indicator: null, label: 'Failed', tone: 'danger' },
  INITIALIZING: { indicator: 'activity', label: 'Initializing', tone: 'progress' },
  NEEDS_APPROVAL: { indicator: 'attention', label: 'Needs approval', tone: 'progress' },
  QUEUED: { indicator: 'waiting', label: 'Queued', tone: 'progress' },
  REMOVED: { indicator: null, label: 'Removed', tone: 'neutral' },
  REMOVING: { indicator: 'activity', label: 'Removing', tone: 'progress' },
  SKIPPED: { indicator: null, label: 'Skipped', tone: 'neutral' },
  SLEEPING: { indicator: null, label: 'Sleeping', tone: 'neutral' },
  SUCCESS: { indicator: null, label: 'Success', tone: 'positive' },
  WAITING: { indicator: 'waiting', label: 'Waiting', tone: 'progress' },
  unknown: { indicator: null, label: 'Unknown', tone: 'neutral' },
}

export function readDeploymentStatusPresentation(status: DeploymentStatus) {
  return deploymentStatusPresentations[status]
}

export function isDeploymentStatusTransitional(status: DeploymentStatus) {
  return transitionalDeploymentStatuses.has(status)
}
