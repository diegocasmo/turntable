import { describe, expect, it } from 'vitest'
import {
  type DeploymentStatus,
  type DeploymentStatusTone,
  deploymentStatusSchema,
  isDeploymentStatusTransitional,
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

const transitionCases: ReadonlyArray<
  Readonly<{ status: DeploymentStatus; transitional: boolean }>
> = [
  { status: 'BUILDING', transitional: true },
  { status: 'CRASHED', transitional: false },
  { status: 'DEPLOYING', transitional: true },
  { status: 'FAILED', transitional: false },
  { status: 'INITIALIZING', transitional: true },
  { status: 'NEEDS_APPROVAL', transitional: true },
  { status: 'QUEUED', transitional: true },
  { status: 'REMOVED', transitional: false },
  { status: 'REMOVING', transitional: true },
  { status: 'SKIPPED', transitional: false },
  { status: 'SLEEPING', transitional: false },
  { status: 'SUCCESS', transitional: false },
  { status: 'WAITING', transitional: true },
  { status: 'unknown', transitional: false },
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

  it.each(transitionCases)(
    'reports $status transitional as $transitional',
    ({ status, transitional }) => {
      expect(isDeploymentStatusTransitional(status)).toBe(transitional)
    },
  )
})
