import { describe, expect, it } from 'vitest'
import {
  type DeploymentStatus,
  type DeploymentStatusTone,
  deploymentStatusSchema,
  isDeploymentStatusTransitional,
  readDeploymentStatusPresentation,
} from '@/railway/deployment-status'

type DeploymentStatusPresentationCase = Readonly<{
  indicator: ReturnType<typeof readDeploymentStatusPresentation>['indicator']
  status: DeploymentStatus
  tone: DeploymentStatusTone
}>

const presentationCases = [
  { indicator: 'activity', status: 'BUILDING', tone: 'progress' },
  { indicator: null, status: 'CRASHED', tone: 'danger' },
  { indicator: 'activity', status: 'DEPLOYING', tone: 'progress' },
  { indicator: null, status: 'FAILED', tone: 'danger' },
  { indicator: 'activity', status: 'INITIALIZING', tone: 'progress' },
  { indicator: 'attention', status: 'NEEDS_APPROVAL', tone: 'progress' },
  { indicator: 'waiting', status: 'QUEUED', tone: 'progress' },
  { indicator: null, status: 'REMOVED', tone: 'neutral' },
  { indicator: 'activity', status: 'REMOVING', tone: 'progress' },
  { indicator: null, status: 'SKIPPED', tone: 'neutral' },
  { indicator: null, status: 'SLEEPING', tone: 'neutral' },
  { indicator: null, status: 'SUCCESS', tone: 'positive' },
  { indicator: 'waiting', status: 'WAITING', tone: 'progress' },
  { indicator: null, status: 'unknown', tone: 'neutral' },
] as const satisfies readonly DeploymentStatusPresentationCase[]

describe('deployment status', () => {
  it('keeps a known Railway status', () => {
    expect(deploymentStatusSchema.parse('SUCCESS')).toBe('SUCCESS')
  })

  it('maps an unknown Railway status to unknown', () => {
    expect(deploymentStatusSchema.parse('A_NEW_RAILWAY_STATUS')).toBe('unknown')
  })

  it.each(presentationCases)(
    'maps $status to the $tone badge with the $indicator indicator',
    ({ indicator, status, tone }) => {
      const presentation = readDeploymentStatusPresentation(status)

      expect(presentation.tone).toBe(tone)
      expect(presentation.indicator).toBe(indicator)
    },
  )

  it('distinguishes transitional and terminal statuses', () => {
    expect(isDeploymentStatusTransitional('INITIALIZING')).toBe(true)
    expect(isDeploymentStatusTransitional('SUCCESS')).toBe(false)
    expect(isDeploymentStatusTransitional('FAILED')).toBe(false)
  })
})
