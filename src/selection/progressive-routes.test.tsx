import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeTree } from '@/routeTree.gen'
import { createRailwayEnvironment, createRailwayProject } from '@/test/railway'

const { readEnvironmentsMock, readProjectsMock } = vi.hoisted(() => ({
  readEnvironmentsMock: vi.fn(),
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
vi.mock('@/selection/read-environments', () => ({ readEnvironments: readEnvironmentsMock }))
vi.stubGlobal('scrollTo', vi.fn())

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
  it('restores q and filters only the visible cards in fuzzy order', async () => {
    renderRoutes('/projects?q=wkr')
    const input = await screen.findByRole('searchbox', { name: 'Search projects' })
    const home = screen.getByRole('link', { name: 'Home' })

    expect(input).toHaveValue('wkr')
    expect(home).toHaveAttribute('aria-current', 'false')
    expect(screen.getByText('Project')).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getAllByRole('link', { name: /^Select / }).map((link) => link.textContent),
    ).toEqual(['WorkerRailway workspace', 'API workerRailway workspace'])
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
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
    renderRoutes('/projects/project-worker/environments?q=prod')
    expect(await screen.findByRole('heading', { name: 'Choose an environment' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Project: Worker' })).toHaveAttribute(
      'href',
      '/projects',
    )
    screen.getByRole('link', { name: 'Project: Worker' }).focus()
    expect(screen.getByRole('link', { name: 'Project: Worker' })).toHaveFocus()
    expect(screen.getByText('Environment')).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('button', { name: /Change project/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Services' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
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

  it('refreshes cards without changing q or starting a duplicate request', async () => {
    const refreshedProjects = Promise.withResolvers<ReturnType<typeof createRailwayProject>[]>()
    readProjectsMock
      .mockResolvedValueOnce([createRailwayProject({ name: 'Web' })])
      .mockReturnValueOnce(refreshedProjects.promise)
    const page = renderRoutes('/projects?q=work')
    expect(await screen.findByText('No results for “work”.')).toBeVisible()
    const refresh = screen.getByRole('button', { name: 'Refresh projects' })

    fireEvent.click(refresh)
    await waitFor(() => expect(readProjectsMock).toHaveBeenCalledTimes(2))
    fireEvent.click(refresh)
    expect(readProjectsMock).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(refresh).toHaveAttribute('aria-busy', 'true'))
    refreshedProjects.resolve([createRailwayProject({ name: 'Worker' })])

    expect(
      await screen.findByRole('link', { name: 'Select Worker in Railway workspace' }),
    ).toBeVisible()
    expect(page.router.state.location.href).toBe('/projects?q=work')
    expect(screen.getByText('Projects refreshed.')).toHaveAttribute('role', 'status')
  })

  it('refreshes the selected project before its environments', async () => {
    readEnvironmentsMock
      .mockResolvedValueOnce([createRailwayEnvironment({ name: 'Production' })])
      .mockResolvedValueOnce([createRailwayEnvironment({ name: 'Staging' })])
    const page = renderRoutes('/projects/project-worker/environments?q=stag')
    expect(await screen.findByText('No results for “stag”.')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Refresh environments' }))

    expect(await screen.findByRole('link', { name: 'Select Staging' })).toBeVisible()
    expect(page.router.state.location.href).toBe('/projects/project-worker/environments?q=stag')
    expect(readProjectsMock).toHaveBeenCalledTimes(2)
  })
})
