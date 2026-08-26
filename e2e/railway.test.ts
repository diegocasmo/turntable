import { describe, expect, it, vi } from 'vitest'
import {
  createRailwayService,
  createSelectionEnvironment,
  createSelectionProject,
  testRailwayApiUrl,
  testRailwayToken,
} from '@/test/railway'
import { type RailwayE2EConfig, runWithRailwayE2ETarget } from './railway'

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
      webSocketUrl: 'wss://backboard.railway.test/graphql/v2',
    }
    const runMutation = vi.fn(async () => undefined)

    await expect(
      runWithRailwayE2ETarget(config, runMutation, {
        readSelectionHierarchy: vi.fn(async () => [
          createSelectionProject({
            environments: [
              createSelectionEnvironment({
                id: 'wrong-environment',
                name: 'production',
                services: [createRailwayService({ id: 'wrong-service', name: 'web' })],
              }),
            ],
            id: 'wrong-project',
            name: 'personal',
          }),
        ]),
      }),
    ).rejects.toThrow('The Railway E2E target is not turntable-e2e/local/target.')
    expect(runMutation).not.toHaveBeenCalled()
  })
})
