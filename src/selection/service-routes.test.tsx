import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeTree } from '@/routeTree.gen'
import {
  createRailwayEnvironment,
  createRailwayProject,
  testRailwayEnvironmentId,
  testRailwayProjectId,
} from '@/test/railway'

const {
  connectMock,
  readEnvironmentsMock,
  readProjectsMock,
  readServicesMock,
  session,
  spinDownMock,
  spinUpMock,
} = vi.hoisted(() => ({
  connectMock: vi.fn(),
  readEnvironmentsMock: vi.fn(),
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
vi.mock('@/selection/read-environments', () => ({ readEnvironments: readEnvironmentsMock }))
vi.mock('@/selection/read-services', () => ({ readServices: readServicesMock }))
vi.mock('@/session/connect-to-railway', () => ({ connectToRailway: connectMock }))
vi.mock('@/deployment/spin-down-deployment', () => ({ spinDownDeployment: spinDownMock }))
vi.mock('@/deployment/spin-up-deployment', () => ({ spinUpDeployment: spinUpMock }))
vi.stubGlobal('scrollTo', vi.fn())

function createService(id: string, name: string, status: 'SUCCESS' | null = 'SUCCESS') {
  return {
    deployment: status ? { id: `deployment-${id}`, status } : null,
    id,
    name,
  }
}

function renderRoutes(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMs: 0,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree,
    Wrap: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  return { router, ...render(<RouterProvider router={router} />) }
}

beforeEach(() => {
  session.current = 'authenticated'
  connectMock.mockReset().mockImplementation(async () => {
    session.current = 'authenticated'
    return session.current
  })
  readProjectsMock.mockReset().mockResolvedValue([createRailwayProject()])
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
  it('restores fuzzy search and renders non-navigating service cards', async () => {
    const listUrl = `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services?q=wkr`
    const page = renderRoutes(listUrl)
    const input = await screen.findByRole('searchbox', { name: 'Search services' })

    expect(input).toHaveValue('wkr')
    expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual([
      'Worker',
      'API worker',
    ])
    fireEvent.click(screen.getByRole('article', { name: 'Worker' }))
    expect(page.router.state.location.href).toBe(listUrl)
    expect(screen.queryByRole('link', { name: /Open Worker/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('loads a bookmarked services URL without prior client state', async () => {
    renderRoutes(
      `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services?q=web`,
    )

    expect(await screen.findByRole('heading', { name: 'Services' })).toBeVisible()
    expect(screen.getByRole('article', { name: 'Web' })).toBeVisible()
    const breadcrumb = screen.getByRole('navigation', { name: 'Selection progress' })
    expect(within(breadcrumb).getByText('Services')).toHaveAttribute('aria-current', 'page')
    expect(readProjectsMock).toHaveBeenCalledOnce()
    expect(readEnvironmentsMock).toHaveBeenCalledOnce()
    expect(readServicesMock).toHaveBeenCalledOnce()
  })

  it('refreshes all service cards without changing q or starting a duplicate request', async () => {
    const refreshedServices = Promise.withResolvers<ReturnType<typeof createService>[]>()
    readServicesMock
      .mockResolvedValueOnce([createService('service-web', 'Web')])
      .mockReturnValueOnce(refreshedServices.promise)
    const listUrl =
      `/projects/${testRailwayProjectId}/environments/` +
      `${testRailwayEnvironmentId}/services?q=work`
    const page = renderRoutes(listUrl)
    expect(await screen.findByText('No results for “work”.')).toBeVisible()
    const refresh = screen.getByRole('button', { name: 'Refresh services' })

    fireEvent.click(refresh)
    await waitFor(() => expect(readServicesMock).toHaveBeenCalledTimes(2))
    fireEvent.click(refresh)
    expect(readServicesMock).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(refresh).toHaveAttribute('aria-busy', 'true'))
    refreshedServices.resolve([createService('service-worker', 'Worker')])

    expect(await screen.findByRole('article', { name: 'Worker' })).toBeVisible()
    expect(page.router.state.location.href).toBe(listUrl)
    expect(screen.getByText('Services refreshed.')).toHaveAttribute('role', 'status')
  })

  it('replaces a stale project after refresh proves it is missing', async () => {
    readProjectsMock.mockResolvedValueOnce([createRailwayProject()]).mockResolvedValueOnce([])
    const page = renderRoutes(
      `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services?q=web`,
    )
    await screen.findByRole('heading', { name: 'Services' })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh services' }))

    expect(await screen.findByRole('heading', { name: 'Choose a project' })).toBeVisible()
    expect(page.router.state.location.href).toBe('/projects')
    expect(screen.getByText('The selected project is no longer available.')).toBeVisible()
    expect(readServicesMock).toHaveBeenCalledOnce()
  })

  it('replaces a stale environment after refresh proves it is missing', async () => {
    readEnvironmentsMock
      .mockResolvedValueOnce([createRailwayEnvironment()])
      .mockResolvedValueOnce([])
    const page = renderRoutes(
      `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services`,
    )
    await screen.findByRole('heading', { name: 'Services' })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh services' }))

    expect(await screen.findByRole('heading', { name: 'Choose an environment' })).toBeVisible()
    expect(page.router.state.location.href).toBe(`/projects/${testRailwayProjectId}/environments`)
    expect(screen.getByText('The selected environment is no longer available.')).toBeVisible()
    expect(readServicesMock).toHaveBeenCalledOnce()
  })

  it('keeps a refresh network failure on the current URL', async () => {
    readProjectsMock
      .mockResolvedValueOnce([createRailwayProject()])
      .mockRejectedValueOnce(new Error('Railway could not refresh projects.'))
    const listUrl =
      `/projects/${testRailwayProjectId}/environments/` +
      `${testRailwayEnvironmentId}/services?q=web`
    const page = renderRoutes(listUrl)
    await screen.findByRole('heading', { name: 'Services' })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh services' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Railway could not refresh projects.',
    )
    expect(page.router.state.location.href).toBe(listUrl)
  })

  it('does not replace a route that the user left during refresh', async () => {
    const refreshedEnvironments =
      Promise.withResolvers<ReturnType<typeof createRailwayEnvironment>[]>()
    readEnvironmentsMock
      .mockResolvedValueOnce([createRailwayEnvironment()])
      .mockReturnValueOnce(refreshedEnvironments.promise)
    const page = renderRoutes(
      `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services`,
    )
    await screen.findByRole('heading', { name: 'Services' })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh services' }))
    await waitFor(() => expect(readEnvironmentsMock).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('link', { name: /^Project:/ }))
    await screen.findByRole('heading', { name: 'Choose a project' })

    refreshedEnvironments.resolve([])
    await refreshedEnvironments.promise
    await Promise.resolve()

    expect(page.router.state.location.href).toBe('/projects')
    expect(screen.getByRole('heading', { name: 'Choose a project' })).toBeVisible()
  })

  it('refetches the visible service snapshot after a successful action', async () => {
    const refreshedServices = Promise.withResolvers<ReturnType<typeof createService>[]>()
    readServicesMock
      .mockResolvedValueOnce([createService('service-web', 'Web')])
      .mockReturnValueOnce(refreshedServices.promise)
    renderRoutes(
      `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services`,
    )
    const card = await screen.findByRole('article', { name: 'Web' })

    expect(card).toHaveTextContent('Success')
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Web' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Spin down' }))
    const confirm = screen.getByRole('button', { name: 'Spin down' })
    fireEvent.click(confirm)

    await waitFor(() => expect(confirm).toHaveAttribute('aria-disabled', 'true'))
    fireEvent.click(confirm)
    expect(spinDownMock).toHaveBeenCalledOnce()
    refreshedServices.resolve([createService('service-web', 'Web', null)])
    await waitFor(() => expect(card).toHaveTextContent('No active deployment'))
    expect(readServicesMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('menuitem', { name: 'Refresh' })).not.toBeInTheDocument()
  })

  it('shows a recoverable error when post-action synchronization fails', async () => {
    readServicesMock
      .mockResolvedValueOnce([createService('service-web', 'Web')])
      .mockRejectedValueOnce(new Error('Railway could not reload services.'))
    renderRoutes(
      `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services?q=web`,
    )
    await screen.findByRole('article', { name: 'Web' })
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Web' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Spin down' }))
    fireEvent.click(screen.getByRole('button', { name: 'Spin down' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spin down completed, but Turntable could not update Web. Reload the page.',
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('does not expose the removed service detail route', async () => {
    renderRoutes(
      `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services/service-web`,
    )

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible()
    expect(readServicesMock).not.toHaveBeenCalled()
  })

  it('resumes a signed-out services deep link after connection', async () => {
    session.current = 'signed-out'
    const listUrl =
      `/projects/${testRailwayProjectId}/environments/` +
      `${testRailwayEnvironmentId}/services?q=worker`
    const page = renderRoutes(listUrl)
    const token = await screen.findByLabelText('Railway API token')
    expect(readProjectsMock).not.toHaveBeenCalled()
    fireEvent.change(token, { target: { value: 'test-token' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Connect to Railway' }))

    expect(await screen.findByRole('heading', { name: 'Services' })).toBeVisible()
    expect(page.router.state.location.href).toBe(listUrl)
  })

  it('replaces the root route with project selection', async () => {
    const page = renderRoutes('/')
    expect(await screen.findByRole('heading', { name: 'Choose a project' })).toBeVisible()
    expect(page.router.state.location.href).toBe('/projects')
    page.router.history.back()
    await waitFor(() => expect(page.router.state.location.href).toBe('/projects'))
  })
})
