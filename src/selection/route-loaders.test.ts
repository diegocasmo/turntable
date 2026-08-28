import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createEnvironmentQueryOptions,
  createEnvironmentsQueryOptions,
  createProjectQueryOptions,
  createProjectsQueryOptions,
} from '@/selection/queries'
import { loadEnvironmentsRoute, loadServicesRoute } from '@/selection/route-loaders'
import {
  createRailwayEnvironment,
  createRailwayProject,
  createRailwayService,
  testRailwayEnvironmentId,
  testRailwayProjectId,
} from '@/test/railway'

const {
  readEnvironmentMock,
  readEnvironmentsMock,
  readProjectMock,
  readProjectsMock,
  readServicesMock,
} = vi.hoisted(() => ({
  readEnvironmentMock: vi.fn(),
  readEnvironmentsMock: vi.fn(),
  readProjectMock: vi.fn(),
  readProjectsMock: vi.fn(),
  readServicesMock: vi.fn(),
}))

vi.mock('@/selection/read-project', () => ({ readProject: readProjectMock }))
vi.mock('@/selection/read-projects', () => ({ readProjects: readProjectsMock }))
vi.mock('@/selection/read-environment', () => ({ readEnvironment: readEnvironmentMock }))
vi.mock('@/selection/read-environments', () => ({ readEnvironments: readEnvironmentsMock }))
vi.mock('@/selection/read-services', () => ({ readServices: readServicesMock }))

function createContext() {
  return {
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }
}

async function catchRedirect(operation: () => Promise<unknown>) {
  try {
    await operation()
  } catch (error) {
    if (isRedirect(error)) return error
    throw error
  }
  throw new Error('The route did not redirect.')
}

beforeEach(() => {
  readProjectMock.mockReset().mockResolvedValue(createRailwayProject())
  readProjectsMock.mockReset().mockResolvedValue([createRailwayProject()])
  readEnvironmentMock.mockReset().mockResolvedValue({
    ...createRailwayEnvironment(),
    projectId: testRailwayProjectId,
  })
  readEnvironmentsMock.mockReset().mockResolvedValue([createRailwayEnvironment()])
  readServicesMock.mockReset().mockResolvedValue([createRailwayService()])
})

describe('selection route loaders', () => {
  it('uses one targeted project read for a cold Environment deep link', async () => {
    await loadEnvironmentsRoute(createContext(), testRailwayProjectId)

    expect(readProjectMock).toHaveBeenCalledOnce()
    expect(readProjectsMock).not.toHaveBeenCalled()
    expect(readEnvironmentsMock).toHaveBeenCalledOnce()
  })

  it('uses targeted parent reads for a cold Services deep link', async () => {
    await loadServicesRoute(createContext(), testRailwayProjectId, testRailwayEnvironmentId)

    expect(readProjectMock).toHaveBeenCalledOnce()
    expect(readEnvironmentMock).toHaveBeenCalledOnce()
    expect(readProjectsMock).not.toHaveBeenCalled()
    expect(readEnvironmentsMock).not.toHaveBeenCalled()
    expect(readServicesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          environmentId: testRailwayEnvironmentId,
          projectId: testRailwayProjectId,
        },
      }),
    )
  })

  it('reuses positive parent collection entries during forward navigation', async () => {
    const context = createContext()
    const staleProject = createRailwayProject({ name: 'Old name' })
    context.queryClient.setQueryData(
      createProjectQueryOptions(testRailwayProjectId).queryKey,
      staleProject,
    )
    context.queryClient.setQueryData(createProjectsQueryOptions().queryKey, [
      createRailwayProject(),
    ])
    context.queryClient.setQueryData(
      createEnvironmentsQueryOptions(testRailwayProjectId).queryKey,
      [createRailwayEnvironment()],
    )

    const result = await loadServicesRoute(context, testRailwayProjectId, testRailwayEnvironmentId)

    expect(result.project.name).toBe('Turntable')
    expect(readProjectMock).not.toHaveBeenCalled()
    expect(readEnvironmentMock).not.toHaveBeenCalled()
    expect(readServicesMock).toHaveBeenCalledOnce()
  })

  it('revalidates a cached missing project', async () => {
    const context = createContext()
    context.queryClient.setQueryData(createProjectQueryOptions(testRailwayProjectId).queryKey, null)

    await loadEnvironmentsRoute(context, testRailwayProjectId)

    expect(readProjectMock).toHaveBeenCalledOnce()
  })

  it('revalidates a cached missing environment', async () => {
    const context = createContext()
    const key = createEnvironmentQueryOptions(
      testRailwayProjectId,
      testRailwayEnvironmentId,
    ).queryKey
    context.queryClient.setQueryData(key, null)

    await loadServicesRoute(context, testRailwayProjectId, testRailwayEnvironmentId)

    expect(readEnvironmentMock).toHaveBeenCalledOnce()
  })

  it('replaces a missing project only after its detail read succeeds', async () => {
    readProjectMock.mockResolvedValue(null)

    const missing = await catchRedirect(() =>
      loadEnvironmentsRoute(createContext(), 'missing-project'),
    )

    expect(missing.options).toMatchObject({ href: '/projects', replace: true })
    expect(readEnvironmentsMock).not.toHaveBeenCalled()
  })

  it('keeps a parent network failure as an error', async () => {
    const failure = new Error('Railway could not load the project.')
    readProjectMock.mockRejectedValue(failure)

    await expect(loadEnvironmentsRoute(createContext(), testRailwayProjectId)).rejects.toBe(failure)
  })

  it('falls back to the valid project when the environment is missing', async () => {
    readEnvironmentMock.mockResolvedValue(null)

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
