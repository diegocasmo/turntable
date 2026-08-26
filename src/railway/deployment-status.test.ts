import { describe, expect, it } from 'vitest'
import {
  type DeploymentStatus,
  type DeploymentStatusTone,
  deploymentStatusSchema,
  readDeploymentStatusPresentation,
} from '@/railway/deployment-status'

const statusToneCases: ReadonlyArray<
  Readonly<{ status: DeploymentStatus; tone: DeploymentStatusTone }>
> = [
  { status: 'SUCCESS', tone: 'positive' },
  { status: 'BUILDING', tone: 'progress' },
  { status: 'NEEDS_APPROVAL', tone: 'progress' },
  { status: 'CRASHED', tone: 'danger' },
  { status: 'REMOVED', tone: 'neutral' },
  { status: 'unknown', tone: 'neutral' },
]

describe('deployment status', () => {
  it('keeps a known Railway status', () => {
    expect(deploymentStatusSchema.parse('SUCCESS')).toBe('SUCCESS')
  })

  it('maps an unknown Railway status to unknown', () => {
    expect(deploymentStatusSchema.parse('A_NEW_RAILWAY_STATUS')).toBe('unknown')
  })

  it.each(statusToneCases)('maps $status to the $tone badge', ({ status, tone }) => {
    expect(readDeploymentStatusPresentation(status).tone).toBe(tone)
  })
})
