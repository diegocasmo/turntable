import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeploymentStatus } from '@/railway/deployment-status'
import {
  createRailwayEnvironment,
  createRailwayProject,
  testRailwayEnvironmentId,
  testRailwayProjectId,
} from '@/test/railway'
import { renderRoutes } from '@/test/render-routes'

const {
  connectMock,
  readEnvironmentMock,
  readEnvironmentsMock,
  readProjectMock,
  readProjectsMock,
  readServicesMock,
  session,
  spinDownMock,
  spinUpMock,
} = vi.hoisted(() => ({
  connectMock: vi.fn(),
  readEnvironmentMock: vi.fn(),
  readEnvironmentsMock: vi.fn(),
  readProjectMock: vi.fn(),
  readProjectsMock: vi.fn(),
  readServicesMock: vi.fn(),
  session: {
    current: 'authenticated' as 'authenticated' | 'expired' | 'signed-out',
  },
  spinDownMock: vi.fn(),
  spinUpMock: vi.fn(),
}))

vi.mock('@/routes/__root', async () => {
  const router =
    await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')
  return {
    Route: router.createRootRoute({
      beforeLoad: () => ({ sessionState: session.current }),
      component: router.Outlet,
      notFoundComponent: () => <h1>Page not found</h1>,
    }),
  }
})
vi.mock('@/selection/read-projects', () => ({ readProjects: readProjectsMock }))
vi.mock('@/selection/read-project', () => ({ readProject: readProjectMock }))
vi.mock('@/selection/read-environments', () => ({ readEnvironments: readEnvironmentsMock }))
vi.mock('@/selection/read-environment', () => ({ readEnvironment: readEnvironmentMock }))
vi.mock('@/selection/read-services', () => ({ readServices: readServicesMock }))
vi.mock('@/session/connect-to-railway', () => ({ connectToRailway: connectMock }))
vi.mock('@/deployment/spin-down-deployment', () => ({ spinDownDeployment: spinDownMock }))
vi.mock('@/deployment/spin-up-deployment', () => ({ spinUpDeployment: spinUpMock }))
vi.stubGlobal('scrollTo', vi.fn())

function createService(id: string, name: string, status: DeploymentStatus | null = 'SUCCESS') {
  return {
    deployment: status ? { id: `deployment-${id}`, status } : null,
    id,
    name,
  }
}

const servicesPath = `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services`

async function renderServicesThroughCollections() {
  const page = renderRoutes('/projects')
  fireEvent.click(
    await screen.findByRole('link', { name: 'Select Turntable in Railway workspace' }),
  )
  fireEvent.click(await screen.findByRole('link', { name: 'Select Production' }))
  await screen.findByRole('heading', { name: 'Services' })
  return page
}

beforeEach(() => {
  session.current = 'authenticated'
  connectMock.mockReset().mockImplementation(async () => {
    session.current = 'authenticated'
    return session.current
  })
  readProjectMock.mockReset().mockResolvedValue(createRailwayProject())
  readProjectsMock.mockReset().mockResolvedValue([createRailwayProject()])
  readEnvironmentMock.mockReset().mockResolvedValue({
    ...createRailwayEnvironment(),
    projectId: testRailwayProjectId,
  })
  readEnvironmentsMock.mockReset().mockResolvedValue([createRailwayEnvironment()])
  readServicesMock
    .mockReset()
    .mockResolvedValue([
      createService('service-api-worker', 'API worker'),
      createService('service-worker', 'Worker'),
      createService('service-web', 'Web'),
    ])
  spinDownMock.mockReset().mockResolvedValue(true)
  spinUpMock.mockReset().mockResolvedValue('deployment-new')
})

describe('service collection route', () => {
  it('keeps parent links visible while services load', async () => {
    const services = Promise.withResolvers<ReturnType<typeof createService>[]>()
    readServicesMock.mockReturnValueOnce(services.promise)
    renderRoutes(servicesPath)

    expect(await screen.findByRole('heading', { name: 'Loading services' })).toBeVisible()
    const breadcrumbs = screen.getByRole('navigation', { name: 'Selection progress' })
    expect(within(breadcrumbs).getByRole('link', { name: 'Project' })).toHaveAttribute(
      'href',
      '/projects',
    )
    expect(within(breadcrumbs).getByRole('link', { name: 'Environment' })).toHaveAttribute(
      'href',
      `/projects/${testRailwayProjectId}/environments`,
    )
    expect(within(breadcrumbs).getByText('Services')).toBeVisible()

    services.resolve([])
  })

  it('keeps parent links visible when services fail to load', async () => {
    readServicesMock.mockRejectedValueOnce(new Error('Railway could not load services.'))
    renderRoutes(servicesPath)

    expect(await screen.findByRole('heading', { name: 'Could not load services' })).toBeVisible()
    const breadcrumbs = screen.getByRole('navigation', { name: 'Selection progress' })
    expect(within(breadcrumbs).getByRole('link', { name: 'Project' })).toBeVisible()
    expect(within(breadcrumbs).getByRole('link', { name: 'Environment' })).toBeVisible()
    expect(within(breadcrumbs).getByText('Services')).toBeVisible()
  })

  it('restores fuzzy search and renders non-navigating service cards', async () => {
    const listUrl = `${servicesPath}?q=wkr`
    renderRoutes(listUrl)
    const input = await screen.findByRole('searchbox', { name: 'Search services' })

    expect(input).toHaveValue('wkr')
    expect(screen.getAllByText(/worker/i)).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Worker' })).not.toBeInTheDocument()
  })

  it('refreshes all service cards without changing q or starting a duplicate request', async () => {
    const refreshedServices = Promise.withResolvers<ReturnType<typeof createService>[]>()
    readServicesMock
      .mockResolvedValueOnce([createService('service-web', 'Web')])
      .mockReturnValueOnce(refreshedServices.promise)
    const listUrl = `${servicesPath}?q=work`
    const page = renderRoutes(listUrl)
    expect(await screen.findByText('No results for “work”.')).toBeVisible()
    const refresh = screen.getByRole('button', { name: 'Refresh services' })

    fireEvent.click(refresh)
    await waitFor(() => expect(readServicesMock).toHaveBeenCalledTimes(2))
    fireEvent.click(refresh)
    expect(readServicesMock).toHaveBeenCalledTimes(2)
    refreshedServices.resolve([createService('service-worker', 'Worker')])

    expect(await screen.findByRole('article', { name: 'Worker' })).toBeVisible()
    expect(page.router.state.location.href).toBe(listUrl)
    expect(screen.getByText('Services refreshed.')).toBeVisible()
  })

  it('replaces a stale project after refresh proves it is missing', async () => {
    readProjectMock.mockResolvedValue(null)
    readProjectsMock.mockResolvedValueOnce([createRailwayProject()]).mockResolvedValueOnce([])
    const page = await renderServicesThroughCollections()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh services' }))

    expect(await screen.findByRole('heading', { name: 'Choose a project' })).toBeVisible()
    expect(page.router.state.location.href).toBe('/projects')
    expect(screen.getByText('The selected project is no longer available.')).toBeVisible()
    expect(screen.queryByRole('link', { name: /Select Turntable/ })).not.toBeInTheDocument()
  })

  it('replaces a stale environment after refresh proves it is missing', async () => {
    readEnvironmentMock.mockResolvedValue(null)
    readEnvironmentsMock
      .mockResolvedValueOnce([createRailwayEnvironment()])
      .mockResolvedValueOnce([])
    const page = await renderServicesThroughCollections()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh services' }))

    expect(await screen.findByRole('heading', { name: 'Choose an environment' })).toBeVisible()
    expect(page.router.state.location.href).toBe(`/projects/${testRailwayProjectId}/environments`)
    expect(screen.getByText('The selected environment is no longer available.')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Select Production' })).not.toBeInTheDocument()
  })

  it('keeps a refresh network failure on the current URL', async () => {
    readProjectMock
      .mockResolvedValueOnce(createRailwayProject())
      .mockRejectedValueOnce(new Error('Railway could not refresh projects.'))
    const listUrl = `${servicesPath}?q=web`
    const page = renderRoutes(listUrl)
    await screen.findByRole('heading', { name: 'Services' })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh services' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Railway could not refresh projects.',
    )
    expect(page.router.state.location.href).toBe(listUrl)
  })

  it('does not replace a route that the user left during refresh', async () => {
    const refreshedEnvironment = Promise.withResolvers<
      (ReturnType<typeof createRailwayEnvironment> & { projectId: string }) | null
    >()
    readEnvironmentMock
      .mockResolvedValueOnce({
        ...createRailwayEnvironment(),
        projectId: testRailwayProjectId,
      })
      .mockReturnValueOnce(refreshedEnvironment.promise)
    const page = renderRoutes(servicesPath)
    await screen.findByRole('heading', { name: 'Services' })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh services' }))
    await waitFor(() => expect(readEnvironmentMock).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('link', { name: /^Project:/ }))
    await screen.findByRole('heading', { name: 'Choose a project' })

    refreshedEnvironment.resolve(null)
    await refreshedEnvironment.promise
    await Promise.resolve()

    expect(page.router.state.location.href).toBe('/projects')
    expect(screen.getByRole('heading', { name: 'Choose a project' })).toBeVisible()
  })

  it('refetches the visible service snapshot after a successful action', async () => {
    const refreshedServices = Promise.withResolvers<ReturnType<typeof createService>[]>()
    readServicesMock
      .mockResolvedValueOnce([createService('service-web', 'Web')])
      .mockReturnValueOnce(refreshedServices.promise)
    renderRoutes(servicesPath)
    const card = await screen.findByRole('article', { name: 'Web' })

    expect(card).toHaveTextContent('Success')
    fireEvent.click(screen.getByRole('button', { name: 'Spin down Web' }))
    const confirm = screen.getByRole('button', { name: 'Spin down Web' })
    fireEvent.click(confirm)

    await waitFor(() => expect(spinDownMock).toHaveBeenCalledOnce())
    refreshedServices.resolve([createService('service-web', 'Web', null)])
    await waitFor(() => expect(card).toHaveTextContent('No active deployment'))
    expect(readServicesMock).toHaveBeenCalledTimes(2)
  })

  it('shows a recoverable error when post-action synchronization fails', async () => {
    readServicesMock
      .mockResolvedValueOnce([createService('service-web', 'Web')])
      .mockRejectedValueOnce(new Error('Railway could not reload services.'))
    renderRoutes(`${servicesPath}?q=web`)
    await screen.findByRole('article', { name: 'Web' })
    fireEvent.click(screen.getByRole('button', { name: 'Spin down Web' }))
    fireEvent.click(screen.getByRole('button', { name: 'Spin down Web' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Railway could not reload services.')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows concurrent lifecycle changes and stops reading after terminal states', async () => {
    vi.useFakeTimers()
    try {
      readServicesMock
        .mockResolvedValueOnce([
          createService('service-web', 'Web', null),
          createService('service-worker', 'Worker'),
        ])
        .mockResolvedValueOnce([
          createService('service-web', 'Web', null),
          createService('service-worker', 'Worker'),
        ])
        .mockResolvedValueOnce([
          createService('service-web', 'Web', 'INITIALIZING'),
          createService('service-worker', 'Worker', 'REMOVING'),
        ])
        .mockResolvedValueOnce([
          createService('service-web', 'Web', 'DEPLOYING'),
          createService('service-worker', 'Worker', 'REMOVING'),
        ])
        .mockResolvedValue([
          createService('service-web', 'Web', 'FAILED'),
          createService('service-worker', 'Worker', null),
        ])
      const page = renderRoutes(`${servicesPath}?q=w`)
      await vi.waitFor(() => expect(screen.getByRole('article', { name: 'Web' })).toBeVisible())

      fireEvent.click(screen.getByRole('button', { name: 'Spin up Web' }))
      fireEvent.click(screen.getByRole('button', { name: 'Spin up Web' }))
      await vi.waitFor(() => expect(readServicesMock).toHaveBeenCalledTimes(2))
      expect(screen.getByText('No active deployment')).toBeVisible()

      await act(() => vi.advanceTimersByTimeAsync(5_000))
      expect(screen.getByText('Initializing')).toBeVisible()
      expect(screen.getByText('Removing')).toBeVisible()

      await act(() => vi.advanceTimersByTimeAsync(5_000))
      expect(screen.getByText('Deploying')).toBeVisible()
      expect(screen.getByText('Removing')).toBeVisible()
      await act(() => vi.advanceTimersByTimeAsync(5_000))
      expect(screen.getByText('Failed')).toBeVisible()
      expect(screen.getByText('No active deployment')).toBeVisible()
      expect(page.router.state.location.href).toContain('/services?q=w')
      expect(readServicesMock).toHaveBeenCalledTimes(5)

      await act(() => vi.advanceTimersByTimeAsync(10_000))
      expect(readServicesMock).toHaveBeenCalledTimes(5)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not expose the removed service detail route', async () => {
    renderRoutes(`${servicesPath}/service-web`)

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible()
    expect(readServicesMock).not.toHaveBeenCalled()
  })

  it('resumes a signed-out services deep link after connection', async () => {
    session.current = 'signed-out'
    const listUrl = `${servicesPath}?q=worker`
    const page = renderRoutes(listUrl)
    const token = await screen.findByLabelText('Railway API token')
    expect(readProjectMock).not.toHaveBeenCalled()
    expect(readProjectsMock).not.toHaveBeenCalled()
    fireEvent.change(token, { target: { value: 'test-token' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Connect to Railway' }))

    expect(await screen.findByRole('heading', { name: 'Services' })).toBeVisible()
    expect(page.router.state.location.href).toBe(listUrl)
  })

  it('replaces the root route with project selection', async () => {
    const page = renderRoutes('/?q=web')
    expect(await screen.findByRole('heading', { name: 'Choose a project' })).toBeVisible()
    expect(page.router.state.location.href).toBe('/projects?q=web')
    page.router.history.back()
    await waitFor(() => expect(page.router.state.location.href).toBe('/projects?q=web'))
  })
})
