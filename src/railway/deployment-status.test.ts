import { describe, expect, it } from 'vitest'
import { deploymentStatusSchema } from './deployment-status.ts'

describe('deployment status', () => {
  it('keeps a known Railway status', () => {
    expect(deploymentStatusSchema.parse('SUCCESS')).toBe('SUCCESS')
  })

  it('maps an unknown Railway status to unknown', () => {
    expect(deploymentStatusSchema.parse('A_NEW_RAILWAY_STATUS')).toBe('unknown')
  })
})
