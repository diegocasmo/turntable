import { describe, expect, it } from 'vitest'
import { checkRailwayTarget, loadRailwaySmokeConfig } from '../src/railway/check-target.server.ts'

describe('real Railway target', () => {
  it('can read the configured project, environment, and service', async () => {
    const config = loadRailwaySmokeConfig()
    const target = await checkRailwayTarget(config)

    expect(target.project.id).toBe(config.projectId)
    expect(target.environment.id).toBe(config.environmentId)
    expect(target.service.id).toBe(config.serviceId)
    expect(target.project.name.length).toBeGreaterThan(0)
    expect(target.environment.name.length).toBeGreaterThan(0)
    expect(target.service.name.length).toBeGreaterThan(0)
  })
})
