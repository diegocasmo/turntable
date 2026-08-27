import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TurntablePage } from '@/components/turntable-page'
import { maximumSessionTokenByteLength, type SessionState } from '@/session/schema'
import { testRailwayToken } from '@/test/railway'

const { connectToRailwayMock, disconnectFromRailwayMock } = vi.hoisted(() => ({
  connectToRailwayMock: vi.fn(),
  disconnectFromRailwayMock: vi.fn(),
}))

vi.mock('@/session/connect-to-railway', () => ({ connectToRailway: connectToRailwayMock }))
vi.mock('@/session/disconnect-from-railway', () => ({
  disconnectFromRailway: disconnectFromRailwayMock,
}))
vi.stubGlobal('scrollTo', vi.fn())

type SessionOperation = () => Promise<SessionState>
type RenderOptions = Readonly<{
  children?: ReactNode
  connect?: SessionOperation
  disconnect?: SessionOperation
  sessionState?: SessionState
}>

function renderComponent(options: RenderOptions = {}) {
  let sessionState = options.sessionState ?? 'signed-out'
  connectToRailwayMock.mockImplementation(
    options.connect ??
      (async () => {
        sessionState = 'authenticated'
        return sessionState
      }),
  )
  disconnectFromRailwayMock.mockImplementation(
    options.disconnect ??
      (async () => {
        sessionState = 'signed-out'
        return sessionState
      }),
  )
  const rootRoute = createRootRoute()
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    loader: () => sessionState,
    component: Component,
  })

  function Component() {
    const currentSession = pageRoute.useLoaderData() ?? sessionState
    return (
      <TurntablePage sessionState={currentSession}>
        {options.children ?? <h1 id="selection-page-title">Choose a project</h1>}
      </TurntablePage>
    )
  }

  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    routeTree: rootRoute.addChildren([pageRoute]),
    Wrap: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  return { queryClient, ...render(<RouterProvider router={router} />) }
}

function submitToken(token = testRailwayToken) {
  fireEvent.change(screen.getByLabelText('Railway API token'), { target: { value: token } })
  fireEvent.submit(screen.getByRole('form', { name: 'Connect to Railway' }))
}

beforeEach(() => {
  connectToRailwayMock.mockReset()
  disconnectFromRailwayMock.mockReset()
})

describe('token and session shell', () => {
  it('shows the token form and required product text', async () => {
    renderComponent()
    const main = await screen.findByRole('main')

    expect(within(main).getByRole('heading', { level: 1, name: 'Turntable' })).toBeVisible()
    expect(within(main).getByLabelText('Railway API token')).toBeRequired()
    expect(within(main).getByRole('button', { name: 'Connect to Railway' })).toBeEnabled()
    const tokenLink = within(main).getByRole('link', {
      name: "Railway's token page (opens in a new tab)",
    })
    expect(tokenLink).toHaveAttribute('target', '_blank')
    expect(tokenLink).toHaveAttribute('rel', 'noreferrer')
  })

  it('shows pending, validation, and server failures', async () => {
    const page = renderComponent({ connect: () => new Promise<SessionState>(() => undefined) })
    await screen.findByLabelText('Railway API token')
    submitToken()
    expect(await screen.findByRole('button', { name: 'Connecting...' })).toBeVisible()
    page.unmount()

    connectToRailwayMock.mockClear()
    renderComponent()
    await screen.findByLabelText('Railway API token')
    submitToken(`${'é'.repeat(maximumSessionTokenByteLength / 2)}a`)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Railway token must contain 1 to 512 UTF-8 bytes.',
    )
    expect(connectToRailwayMock).not.toHaveBeenCalled()
  })

  it('connects without keeping the token mutation', async () => {
    const page = renderComponent()
    page.queryClient.setQueryData(['private-test-data'], 'private')
    await screen.findByLabelText('Railway API token')
    submitToken()

    expect(await screen.findByRole('heading', { name: 'Choose a project' })).toBeVisible()
    expect(connectToRailwayMock.mock.calls[0]?.[0]).toEqual({ data: { token: testRailwayToken } })
    await waitFor(() => expect(page.queryClient.getMutationCache().getAll()).toHaveLength(0))
    expect(page.queryClient.getQueryData(['private-test-data'])).toBeUndefined()
  })

  it('renders one sign-out action in the application header', async () => {
    renderComponent({ sessionState: 'authenticated' })
    const header = await screen.findByRole('banner')

    expect(within(header).getByRole('button', { name: 'Sign out this browser' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Sign out this browser' })).toHaveLength(1)
  })

  it('shows a safe sign-out failure and can sign out', async () => {
    const message = 'Railway could not sign out this browser.'
    const failed = renderComponent({
      disconnect: () => Promise.reject(new Error(message)),
      sessionState: 'authenticated',
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out this browser' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Sign out failed. Try again' })).toBeEnabled()
    failed.unmount()

    const page = renderComponent({ sessionState: 'authenticated' })
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out this browser' }))
    expect(await screen.findByLabelText('Railway API token')).toBeVisible()
    expect(page.queryClient.getQueryCache().getAll()).toHaveLength(0)
  })
})
