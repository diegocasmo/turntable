import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

function createService(id: string, name: string, status: 'SUCCESS' | null = 'SUCCESS') {
  return {
    deployment: status ? { id: `deployment-${id}`, status } : null,
    id,
    name,
  }
}

const servicesPath = `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services`

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

  it('shows a missing environment notice until the user selects an environment', async () => {
    readEnvironmentMock.mockResolvedValueOnce(null)
    const page = renderRoutes(servicesPath)

    expect(await screen.findByRole('heading', { name: 'Choose an environment' })).toBeVisible()
    expect(page.router.state.location.href).toBe(
      `/projects/${testRailwayProjectId}/environments?notice=unavailable`,
    )
    const selection = screen.getByRole('region', { name: 'Choose an environment' })
    expect(within(selection).getByText('The selected environment is not available.')).toBeVisible()
    fireEvent.click(screen.getByRole('link', { name: 'Select Production' }))

    await waitFor(() => expect(page.router.state.location.href).toBe(servicesPath))
    expect(await screen.findByRole('heading', { name: 'Services' })).toBeVisible()
    expect(
      within(screen.getByRole('region', { name: 'Services' })).queryByText(
        'The selected environment is not available.',
      ),
    ).toBeNull()
  })

  it('restores fuzzy search and renders non-navigating service cards', async () => {
    const listUrl = `${servicesPath}?q=wkr`
    renderRoutes(listUrl)
    const input = await screen.findByRole('searchbox', { name: 'Search services' })

    expect(input).toHaveValue('wkr')
    expect(screen.getAllByText(/worker/i)).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Worker' })).not.toBeInTheDocument()
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
