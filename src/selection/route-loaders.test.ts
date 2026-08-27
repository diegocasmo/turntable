import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadEnvironmentsRoute, loadServicesRoute } from '@/selection/route-loaders'
import {
  createRailwayEnvironment,
  createRailwayProject,
  createRailwayService,
  testRailwayEnvironmentId,
  testRailwayProjectId,
} from '@/test/railway'

const { readEnvironmentsMock, readProjectsMock, readServicesMock } = vi.hoisted(() => ({
  readEnvironmentsMock: vi.fn(),
  readProjectsMock: vi.fn(),
  readServicesMock: vi.fn(),
}))

vi.mock('@/selection/read-projects', () => ({ readProjects: readProjectsMock }))
vi.mock('@/selection/read-environments', () => ({ readEnvironments: readEnvironmentsMock }))
vi.mock('@/selection/read-services', () => ({ readServices: readServicesMock }))

function createContext() {
  return {
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }
}

async function catchRedirect(operation: () => Promise<void>) {
  try {
    await operation()
  } catch (error) {
    if (isRedirect(error)) return error
    throw error
  }
  throw new Error('The route did not redirect.')
}

beforeEach(() => {
  readProjectsMock.mockReset().mockResolvedValue([createRailwayProject()])
  readEnvironmentsMock.mockReset().mockResolvedValue([createRailwayEnvironment()])
  readServicesMock.mockReset().mockResolvedValue([createRailwayService()])
})

describe('selection route loaders', () => {
  it('loads the services deep link with its stable parent IDs', async () => {
    await loadServicesRoute(createContext(), testRailwayProjectId, testRailwayEnvironmentId)

    expect(readProjectsMock).toHaveBeenCalledOnce()
    expect(readEnvironmentsMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { projectId: testRailwayProjectId } }),
    )
    expect(readServicesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          environmentId: testRailwayEnvironmentId,
          projectId: testRailwayProjectId,
        },
      }),
    )
  })

  it('replaces a missing project only after a successful project read', async () => {
    readProjectsMock.mockResolvedValue([])

    const missing = await catchRedirect(() =>
      loadEnvironmentsRoute(createContext(), 'missing-project'),
    )

    expect(missing.options).toMatchObject({ href: '/projects', replace: true })
    expect(readEnvironmentsMock).not.toHaveBeenCalled()
  })

  it('keeps a network failure as an error instead of a not-found redirect', async () => {
    const failure = new Error('Railway could not load projects.')
    readProjectsMock.mockRejectedValue(failure)

    await expect(loadEnvironmentsRoute(createContext(), testRailwayProjectId)).rejects.toBe(failure)
  })

  it('falls back to the valid project when an environment is missing', async () => {
    readEnvironmentsMock.mockResolvedValue([])

    const missing = await catchRedirect(() =>
      loadServicesRoute(createContext(), testRailwayProjectId, 'missing-environment'),
    )

    expect(missing.options).toMatchObject({
      href: `/projects/${testRailwayProjectId}/environments`,
      replace: true,
    })
    expect(readServicesMock).not.toHaveBeenCalled()
  })
})
