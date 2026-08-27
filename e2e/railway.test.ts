import { describe, expect, it, vi } from 'vitest'
import {
  createRailwayEnvironment,
  createRailwayProject,
  testRailwayApiUrl,
  testRailwayToken,
} from '@/test/railway'
import { type RailwayE2EConfig, restoreRailwayE2ETarget, runWithRailwayE2ETarget } from './railway'

describe('Railway E2E target guard', () => {
  it('does not run against self-consistent IDs for the wrong target', async () => {
    const config: RailwayE2EConfig = {
      apiUrl: testRailwayApiUrl,
      expectedEnvironmentName: 'local',
      target: {
        environmentId: 'wrong-environment',
        projectId: 'wrong-project',
        serviceId: 'wrong-service',
      },
      token: testRailwayToken,
    }
    const runMutation = vi.fn(async () => undefined)

    await expect(
      runWithRailwayE2ETarget(config, runMutation, {
        readProjects: vi.fn(async () => [
          createRailwayProject({ id: 'wrong-project', name: 'personal' }),
        ]),
        readEnvironments: vi.fn(async () => [
          createRailwayEnvironment({ id: 'wrong-environment', name: 'production' }),
        ]),
        readServices: vi.fn(async () => [{ deployment: null, id: 'wrong-service', name: 'web' }]),
      }),
    ).rejects.toThrow('The Railway E2E target is not turntable-e2e/local/target.')
    expect(runMutation).not.toHaveBeenCalled()
  })

  it('uses bounded cleanup delays until the restored deployment succeeds', async () => {
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
    const delays: number[] = []
    let now = 0
    const readStatus = vi
      .fn()
      .mockResolvedValueOnce('INITIALIZING')
      .mockResolvedValueOnce('DEPLOYING')
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

    expect(delays).toEqual([1_000, 2_000, 4_000, 5_000])
    expect(readStatus).toHaveBeenCalledTimes(4)
  })

  it('retries a failed cleanup status read within the same bounded schedule', async () => {
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
    const delays: number[] = []
    let now = 0

    await restoreRailwayE2ETarget(config, {
      readNow: () => now,
      readStatus: vi
        .fn()
        .mockRejectedValueOnce(new Error('Railway returned HTTP 503.'))
        .mockResolvedValueOnce('SUCCESS'),
      spinUp: vi.fn(async () => 'deployment-new'),
      wait: vi.fn(async (delay: number) => {
        delays.push(delay)
        now += delay
      }),
    })

    expect(delays).toEqual([1_000, 2_000])
  })
})
