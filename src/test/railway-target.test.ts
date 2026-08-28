import { describe, expect, it, vi } from 'vitest'
import {
  createRailwayEnvironment,
  createRailwayProject,
  testRailwayApiUrl,
  testRailwayToken,
} from '@/test/railway'
import {
  type RailwayE2EConfig,
  restoreRailwayE2ETarget,
  runWithRailwayE2ETarget,
} from '../../e2e/railway'

const config: RailwayE2EConfig = {
  apiUrl: testRailwayApiUrl,
  expectedEnvironmentName: 'local',
  target: {
    environmentId: 'environment',
    projectId: 'project',
    serviceId: 'service',
  },
  token: testRailwayToken,
}

describe('Railway test target', () => {
  it('does not mutate a target with unexpected names', async () => {
    const runMutation = vi.fn(async () => undefined)

    await expect(
      runWithRailwayE2ETarget(config, runMutation, {
        readProjects: vi.fn(async () => [
          createRailwayProject({ id: 'project', name: 'personal' }),
        ]),
        readEnvironments: vi.fn(async () => [
          createRailwayEnvironment({ id: 'environment', name: 'production' }),
        ]),
        readServices: vi.fn(async () => [{ deployment: null, id: 'service', name: 'web' }]),
      }),
    ).rejects.toThrow('The Railway E2E target is not turntable-e2e/local/target.')
    expect(runMutation).not.toHaveBeenCalled()
  })

  it('restores the target after a transient status failure', async () => {
    const delays: number[] = []
    let now = 0
    const readStatus = vi
      .fn()
      .mockRejectedValueOnce(new Error('Railway returned HTTP 503.'))
      .mockResolvedValueOnce('BUILDING')
      .mockResolvedValueOnce('SUCCESS')

    await restoreRailwayE2ETarget(config, {
      readNow: () => now,
      readStatus,
      spinUp: vi.fn(async () => 'deployment-new'),
      wait: vi.fn(async (delay: number) => {
        delays.push(delay)
        now += delay
      }),
    })

    expect(delays).toEqual([1_000, 2_000, 4_000])
    expect(readStatus).toHaveBeenCalledTimes(3)
  })
})
