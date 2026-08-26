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
