import type { QueryClient } from '@tanstack/react-query'
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
    current: 'authenticated' as 'authenticated' | 'expired' | 'signed-out' | 'token-rejected',
  },
  spinDownMock: vi.fn(),
  spinUpMock: vi.fn(),
}))

vi.mock('@/routes/__root', async () => {
  const router =
    await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')
  return {
    Route: router.createRootRouteWithContext<{ queryClient: QueryClient }>()({
      beforeLoad: ({ context }) => ({
        sessionState: context.queryClient.getQueryData(['session']) ?? session.current,
      }),
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

const servicesPath = `/environments/${testRailwayEnvironmentId}/services`
const legacyServicesPath = `/projects/${testRailwayProjectId}/environments/${testRailwayEnvironmentId}/services`

beforeEach(() => {
  session.current = 'authenticated'
  connectMock.mockReset().mockImplementation(async () => {
    session.current = 'authenticated'
    return session.current
  })
  readProjectMock.mockReset().mockResolvedValue(createRailwayProject())
  readProjectsMock.mockReset().mockResolvedValue([createRailwayProject()])
  readEnvironmentMock.mockReset().mockResolvedValue(createRailwayEnvironment())
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
    const projectLink = within(breadcrumbs).getByRole('link', { name: 'Project: Turntable' })
    const environmentLink = within(breadcrumbs).getByRole('link', {
      name: 'Environment: Production',
    })
    expect(projectLink).toHaveAttribute('href', '/projects')
    expect(projectLink).toHaveClass('underline')
    expect(environmentLink).toHaveAttribute(
      'href',
      `/projects/${testRailwayProjectId}/environments`,
    )
    expect(environmentLink).toHaveClass('underline')
    expect(within(breadcrumbs).getByText('Services')).toHaveAttribute('aria-current', 'page')

    services.resolve([])
  })

  it('keeps long breadcrumb links accessible and exposes the full focused label', async () => {
    const projectName = 'Turntable project with a very long name'
    const environmentName = 'Production environment with a very long name'
    readProjectMock.mockResolvedValueOnce(createRailwayProject({ name: projectName }))
    readEnvironmentMock.mockResolvedValueOnce(createRailwayEnvironment({ name: environmentName }))
    renderRoutes(servicesPath)
    expect(await screen.findByRole('heading', { name: 'Services' })).toBeVisible()
    const breadcrumb = screen.getByRole('navigation', { name: 'Selection progress' })
    const projectLabel = `Project: ${projectName}`
    const environmentLabel = `Environment: ${environmentName}`
    const projectLink = within(breadcrumb).getByRole('link', { name: projectLabel })
    const environmentLink = within(breadcrumb).getByRole('link', { name: environmentLabel })

    expect(projectLink).toHaveAttribute('href', '/projects')
    expect(environmentLink).toHaveAttribute(
      'href',
      `/projects/${testRailwayProjectId}/environments`,
    )

    fireEvent.focus(projectLink)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(projectLabel)
  })

  it('keeps a long service name in the card accessible name and title', async () => {
    const serviceName = 'Service with a very long name that must stay on one line'
    readServicesMock.mockResolvedValueOnce([createService('service-long', serviceName)])
    renderRoutes(servicesPath)
    const card = await screen.findByRole('article', { name: serviceName })

    expect(card).toHaveAccessibleName(serviceName)
    expect(within(card).getByText(serviceName)).toHaveAttribute('title', serviceName)
  })

  it('keeps parent links visible when services fail to load', async () => {
    readServicesMock.mockRejectedValueOnce(new Error('Railway could not load services.'))
    renderRoutes(servicesPath)

    expect(await screen.findByRole('heading', { name: 'Could not load services' })).toBeVisible()
    const breadcrumbs = screen.getByRole('navigation', { name: 'Selection progress' })
    expect(within(breadcrumbs).getByRole('link', { name: 'Project: Turntable' })).toBeVisible()
    expect(within(breadcrumbs).getByRole('link', { name: 'Environment: Production' })).toBeVisible()
    expect(within(breadcrumbs).getByText('Services')).toBeVisible()
  })

  it('shows a missing environment notice until the user selects an environment', async () => {
    readEnvironmentMock.mockResolvedValueOnce(null)
    const page = renderRoutes(servicesPath)

    expect(await screen.findByRole('heading', { name: 'Choose a project' })).toBeVisible()
    expect(page.router.state.location.href).toBe('/projects?notice=unavailable')
    const selection = screen.getByRole('region', { name: 'Choose a project' })
    expect(
      within(selection).getByRole('status', { name: 'Project unavailable' }),
    ).toHaveTextContent('Project unavailableChoose another project to continue.')
    fireEvent.click(screen.getByRole('link', { name: /Select Turntable/i }))
    expect(await screen.findByRole('heading', { name: 'Choose an environment' })).toBeVisible()
    fireEvent.click(screen.getByRole('link', { name: 'Select Production' }))

    await waitFor(() => expect(page.router.state.location.href).toBe(servicesPath))
    expect(await screen.findByRole('heading', { name: 'Services' })).toBeVisible()
    expect(
      within(screen.getByRole('region', { name: 'Services' })).queryByText(/unavailable/i),
    ).toBeNull()
    page.router.history.back()
    await waitFor(() =>
      expect(page.router.state.location.href).toBe(
        `/projects/${testRailwayProjectId}/environments`,
      ),
    )
    expect(screen.queryByText('Environment unavailable')).toBeNull()
  })

  it.each([
    ['expired', 'Session expired', 'Enter your Railway API token to reconnect.'],
    [
      'token-rejected',
      'Railway connection ended',
      'Railway did not accept the previous token. Enter a valid token to reconnect.',
    ],
  ] as const)('shows and dismisses the %s session warning', async (state, title, message) => {
    session.current = state
    const page = renderRoutes(servicesPath)
    const alert = await screen.findByRole('alert')
    const token = screen.getByLabelText('Railway API token')

    expect(alert).toHaveTextContent(`${title}${message}`)
    expect(token).toHaveAccessibleDescription(message)
    fireEvent.click(screen.getByRole('button', { name: /Dismiss .* warning/i }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(page.router.state.location.href).not.toContain('notice=')
    expect(token).toHaveFocus()
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

  it('does not expose the old Services route', async () => {
    renderRoutes(legacyServicesPath)

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible()
    expect(readServicesMock).not.toHaveBeenCalled()
  })

  it('replaces the root route with project selection', async () => {
    const page = renderRoutes('/?q=web')
    expect(await screen.findByRole('heading', { name: 'Choose a project' })).toBeVisible()
    expect(page.router.state.location.href).toBe('/projects?q=web')
    page.router.history.back()
    await waitFor(() => expect(page.router.state.location.href).toBe('/projects?q=web'))
  })
})
