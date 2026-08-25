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

vi.mock('@/session/connect', () => ({ connectToRailway: connectToRailwayMock }))
vi.mock('@/session/disconnect', () => ({ disconnectFromRailway: disconnectFromRailwayMock }))
vi.stubGlobal('scrollTo', vi.fn())

type SessionOperation = () => Promise<SessionState>

type RenderOptions = Readonly<{
  connect?: SessionOperation
  disconnect?: SessionOperation
  sessionState?: SessionState
}>

function renderTurntablePage(options: RenderOptions = {}) {
  let sessionState = options.sessionState ?? 'signed-out'
  const connect =
    options.connect ??
    (async () => {
      sessionState = 'authenticated'
      return sessionState
    })
  const disconnect =
    options.disconnect ??
    (async () => {
      sessionState = 'signed-out'
      return sessionState
    })

  connectToRailwayMock.mockImplementation(connect)
  disconnectFromRailwayMock.mockImplementation(disconnect)

  const rootRoute = createRootRoute()
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    loader: () => sessionState,
    component: TestPage,
  })

  function TestPage() {
    return <TurntablePage sessionState={pageRoute.useLoaderData()} />
  }

  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    routeTree: rootRoute.addChildren([pageRoute]),
    Wrap: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })

  return {
    queryClient,
    ...render(<RouterProvider router={router} />),
  }
}

function submitToken(token = testRailwayToken) {
  fireEvent.change(screen.getByLabelText('Workspace token'), {
    target: { value: token },
  })
  fireEvent.submit(screen.getByRole('form', { name: 'Connect to Railway' }))
}

describe('Token form', () => {
  beforeEach(() => {
    connectToRailwayMock.mockReset()
    disconnectFromRailwayMock.mockReset()
  })

  it('shows the idle state and the required product text', async () => {
    renderTurntablePage()

    const main = await screen.findByRole('main')

    expect(within(main).getByRole('heading', { level: 1, name: 'Turntable' })).toBeVisible()
    expect(within(main).getByLabelText('Workspace token')).toBeRequired()
    expect(within(main).getByRole('button', { name: 'Connect to Railway' })).toBeEnabled()
    const railwayTokensLink = within(main).getByRole('link', {
      name: 'workspace token from Railway (opens in a new tab)',
    })
    expect(railwayTokensLink).toHaveAttribute('href', 'https://railway.com/account/tokens')
    expect(railwayTokensLink).toHaveAttribute('target', '_blank')
    expect(railwayTokensLink).toHaveAttribute('rel', 'noreferrer')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Unofficial. Not a Railway product.')
  })

  it('shows the pending state while Railway checks the token', async () => {
    renderTurntablePage({ connect: () => new Promise<SessionState>(() => undefined) })

    await screen.findByLabelText('Workspace token')
    submitToken()

    expect(await screen.findByRole('button', { name: 'Connecting...' })).toBeDisabled()
    expect(screen.getByLabelText('Workspace token')).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Railway is checking the token.')
  })

  it('rejects an invalid token before it calls the server', async () => {
    renderTurntablePage()
    const tokenAboveByteLimit = `${'é'.repeat(maximumSessionTokenByteLength / 2)}a`

    await screen.findByLabelText('Workspace token')
    submitToken(tokenAboveByteLimit)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Railway token must contain 1 to 512 UTF-8 bytes.',
    )
    expect(connectToRailwayMock).not.toHaveBeenCalled()
  })

  it('shows a safe server error', async () => {
    const { queryClient } = renderTurntablePage({
      connect: () => Promise.reject(new Error('Railway could not verify this token.')),
    })

    await screen.findByLabelText('Workspace token')
    submitToken()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Railway could not verify this token.',
    )
    expect(screen.getByRole('button', { name: 'Connect to Railway' })).toBeEnabled()
    expect(queryClient.getMutationCache().getAll()[0]?.state.variables).toBeUndefined()
  })

  it('shows the success state and clears the token mutation', async () => {
    const { queryClient } = renderTurntablePage()

    await screen.findByLabelText('Workspace token')
    submitToken()

    expect(await screen.findByRole('heading', { name: 'Connected to Railway' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Railway accepted your workspace token.')
    expect(connectToRailwayMock.mock.calls[0]?.[0]).toEqual({
      data: { token: testRailwayToken },
    })
    await waitFor(() => expect(queryClient.getMutationCache().getAll()).toHaveLength(0))
  })

  it('signs out this browser', async () => {
    renderTurntablePage({ sessionState: 'authenticated' })

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out this browser' }))

    expect(await screen.findByLabelText('Workspace token')).toBeVisible()
    expect(disconnectFromRailwayMock.mock.calls[0]?.[0]).toEqual({})
  })

  it('shows an expired session', async () => {
    renderTurntablePage({ sessionState: 'expired' })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your session expired. Enter your workspace token again.',
    )
    expect(screen.getByLabelText('Workspace token')).toBeVisible()
  })
})
