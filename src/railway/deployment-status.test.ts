import { describe, expect, it } from 'vitest'
import {
  type DeploymentStatus,
  type DeploymentStatusTone,
  deploymentStatusSchema,
  isDeploymentStatusTransitional,
  readDeploymentStatusPresentation,
} from '@/railway/deployment-status'

type DeploymentStatusIndicator = ReturnType<typeof readDeploymentStatusPresentation>['indicator']
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
const statusIndicatorCases = [
  { indicator: 'activity', status: 'BUILDING' },
  { indicator: null, status: 'CRASHED' },
  { indicator: 'activity', status: 'DEPLOYING' },
  { indicator: null, status: 'FAILED' },
  { indicator: 'activity', status: 'INITIALIZING' },
  { indicator: 'attention', status: 'NEEDS_APPROVAL' },
  { indicator: 'waiting', status: 'QUEUED' },
  { indicator: null, status: 'REMOVED' },
  { indicator: 'activity', status: 'REMOVING' },
  { indicator: null, status: 'SKIPPED' },
  { indicator: null, status: 'SLEEPING' },
  { indicator: null, status: 'SUCCESS' },
  { indicator: 'waiting', status: 'WAITING' },
  { indicator: null, status: 'unknown' },
] as const satisfies ReadonlyArray<
  Readonly<{ indicator: DeploymentStatusIndicator; status: DeploymentStatus }>
>

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

  it.each(statusIndicatorCases)(
    'maps $status to the $indicator indicator',
    ({ indicator, status }) => {
      expect(readDeploymentStatusPresentation(status).indicator).toBe(indicator)
    },
  )

  it('distinguishes transitional and terminal statuses', () => {
    expect(isDeploymentStatusTransitional('INITIALIZING')).toBe(true)
    expect(isDeploymentStatusTransitional('SUCCESS')).toBe(false)
    expect(isDeploymentStatusTransitional('FAILED')).toBe(false)
  })
})
