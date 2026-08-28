import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRailwayEnvironment, createRailwayProject } from '@/test/railway'
import { renderRoutes } from '@/test/render-routes'

const { readEnvironmentsMock, readProjectMock, readProjectsMock } = vi.hoisted(() => ({
  readEnvironmentsMock: vi.fn(),
  readProjectMock: vi.fn(),
  readProjectsMock: vi.fn(),
}))

vi.mock('@/routes/__root', async () => {
  const router =
    await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')
  return {
    Route: router.createRootRoute({
      beforeLoad: () => ({ sessionState: 'authenticated' as const }),
      component: router.Outlet,
    }),
  }
})
vi.mock('@/selection/read-projects', () => ({ readProjects: readProjectsMock }))
vi.mock('@/selection/read-project', () => ({ readProject: readProjectMock }))
vi.mock('@/selection/read-environments', () => ({ readEnvironments: readEnvironmentsMock }))
vi.stubGlobal('scrollTo', vi.fn())

beforeEach(() => {
  readProjectMock
    .mockReset()
    .mockResolvedValue(createRailwayProject({ id: 'project-worker', name: 'Worker' }))
  readProjectsMock
    .mockReset()
    .mockResolvedValue([
      createRailwayProject({ id: 'project-web', name: 'Web' }),
      createRailwayProject({ id: 'project-api-worker', name: 'API worker' }),
      createRailwayProject({ id: 'project-worker', name: 'Worker' }),
    ])
  readEnvironmentsMock.mockReset().mockResolvedValue([createRailwayEnvironment()])
})

describe('progressive project and environment routes', () => {
  it('keeps the Project flow visible while projects load', async () => {
    const projects = Promise.withResolvers<ReturnType<typeof createRailwayProject>[]>()
    readProjectsMock.mockReturnValueOnce(projects.promise)
    renderRoutes('/projects')

    expect(await screen.findByRole('heading', { name: 'Loading projects' })).toBeVisible()
    const breadcrumbs = screen.getByRole('navigation', { name: 'Selection progress' })
    expect(within(breadcrumbs).getByText('Project')).toBeVisible()
    expect(within(breadcrumbs).getByRole('button', { name: 'Environment' })).toBeVisible()
    expect(within(breadcrumbs).getByRole('button', { name: 'Services' })).toBeVisible()
    expect(within(breadcrumbs).queryByText('Selection')).not.toBeInTheDocument()

    projects.resolve([])
  })

  it('keeps Project navigation when environments fail to load', async () => {
    readEnvironmentsMock.mockRejectedValueOnce(new Error('Railway could not load environments.'))
    renderRoutes('/projects/project-worker/environments')

    expect(
      await screen.findByRole('heading', { name: 'Could not load environments' }),
    ).toBeVisible()
    const breadcrumbs = screen.getByRole('navigation', { name: 'Selection progress' })
    expect(within(breadcrumbs).getByRole('link', { name: 'Project' })).toHaveAttribute(
      'href',
      '/projects',
    )
    expect(within(breadcrumbs).getByText('Environment')).toBeVisible()
    expect(within(breadcrumbs).getByRole('button', { name: 'Services' })).toBeVisible()
  })

  it('restores q and filters the visible cards', async () => {
    renderRoutes('/projects?q=wkr')
    const input = await screen.findByRole('searchbox', { name: 'Search projects' })

    expect(input).toHaveValue('wkr')
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Select Worker in Railway workspace' })).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Select API worker in Railway workspace' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Select Web in Railway workspace' }),
    ).not.toBeInTheDocument()
  })

  it('replaces q while typing and clears it for normal card navigation', async () => {
    const page = renderRoutes('/projects')
    const input = await screen.findByRole('searchbox', { name: 'Search projects' })

    fireEvent.change(input, { target: { value: 'w' } })
    fireEvent.change(input, { target: { value: 'worker' } })
    await waitFor(() => expect(page.router.state.location.href).toBe('/projects?q=worker'))
    expect(page.router.history.length).toBe(1)
    fireEvent.click(screen.getByRole('link', { name: 'Select Worker in Railway workspace' }))

    await waitFor(() =>
      expect(page.router.state.location.href).toBe('/projects/project-worker/environments'),
    )
    expect(page.router.history.length).toBe(2)
    page.router.history.back()
    await waitFor(() => expect(page.router.state.location.href).toBe('/projects?q=worker'))
    page.router.history.forward()
    await waitFor(() =>
      expect(page.router.state.location.href).toBe('/projects/project-worker/environments'),
    )
  })

  it('uses breadcrumbs for backward navigation and keeps future steps disabled', async () => {
    const page = renderRoutes('/projects/project-worker/environments?q=prod')
    expect(await screen.findByRole('heading', { name: 'Choose an environment' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /Change project/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Services' }))
    expect(page.router.state.location.href).toBe('/projects/project-worker/environments?q=prod')

    fireEvent.click(screen.getByRole('link', { name: 'Project: Worker' }))
    await waitFor(() => expect(page.router.state.location.href).toBe('/projects'))
  })

  it('distinguishes same-named projects by workspace', async () => {
    readProjectsMock.mockResolvedValue([
      createRailwayProject({
        id: 'project-one',
        name: 'API',
        workspace: { id: 'workspace-one', name: 'First workspace' },
      }),
      createRailwayProject({
        id: 'project-two',
        name: 'API',
        workspace: { id: 'workspace-two', name: 'Second workspace' },
      }),
    ])
    renderRoutes('/projects')

    expect(
      await screen.findByRole('link', { name: 'Select API in First workspace' }),
    ).toHaveAttribute('href', '/projects/project-one/environments')
    expect(screen.getByRole('link', { name: 'Select API in Second workspace' })).toHaveAttribute(
      'href',
      '/projects/project-two/environments',
    )
  })
})
