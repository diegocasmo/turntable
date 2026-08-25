import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TokenForm } from '@/components/token-form'
import { maximumSessionTokenByteLength } from '@/session-schema'
import { testRailwayToken } from '@/test/fixtures'

function createJsonResponse(body: unknown, status: number) {
  return Response.json(body, { status })
}

function renderTokenForm(fetchRequest = vi.fn(async () => new Response(null, { status: 204 }))) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })

  return {
    fetchRequest,
    queryClient,
    ...render(<TokenForm fetchRequest={fetchRequest} />, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    }),
  }
}

function submitToken(token = testRailwayToken) {
  fireEvent.change(screen.getByLabelText('Workspace token'), {
    target: { value: token },
  })
  fireEvent.submit(screen.getByRole('form', { name: 'Connect to Railway' }))
}

describe('Token form', () => {
  it('shows the idle state and the required help text', () => {
    renderTokenForm()

    const main = screen.getByRole('main')

    expect(within(main).getByRole('heading', { level: 1, name: 'Turntable' })).toBeVisible()
    expect(within(main).getByLabelText('Workspace token')).toBeRequired()
    expect(within(main).getByRole('button', { name: 'Connect to Railway' })).toBeEnabled()
    expect(
      within(main).getByRole('link', { name: 'workspace token from Railway' }),
    ).toHaveAttribute('href', 'https://railway.com/account/tokens')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Unofficial. Not a Railway product.')
  })

  it('shows the pending state while Railway checks the token', async () => {
    const fetchRequest = vi.fn(() => new Promise<Response>(() => undefined))
    renderTokenForm(fetchRequest)

    submitToken()

    expect(await screen.findByRole('button', { name: 'Connecting...' })).toBeDisabled()
    expect(screen.getByLabelText('Workspace token')).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Railway is checking the token.')
  })

  it('rejects an invalid token before it sends a request', async () => {
    const { fetchRequest } = renderTokenForm()
    const tokenAboveByteLimit = `${'é'.repeat(maximumSessionTokenByteLength / 2)}a`

    submitToken(tokenAboveByteLimit)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Railway token must contain 1 to 512 UTF-8 bytes.',
    )
    expect(fetchRequest).not.toHaveBeenCalled()
  })

  it('shows the error returned by the session route', async () => {
    const fetchRequest = vi.fn(async () => createJsonResponse({ error: 'Not Authorized' }, 401))
    renderTokenForm(fetchRequest)

    submitToken()

    expect(await screen.findByRole('alert')).toHaveTextContent('Not Authorized')
    expect(screen.getByRole('button', { name: 'Connect to Railway' })).toBeEnabled()
  })

  it('shows the success state and lets the user sign out this browser', async () => {
    const fetchRequest = vi.fn(async () => new Response(null, { status: 204 }))
    const { queryClient } = renderTokenForm(fetchRequest)

    submitToken()

    expect(await screen.findByRole('heading', { name: 'Connected to Railway' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Railway accepted your workspace token.')
    expect(screen.queryByLabelText('Workspace token')).not.toBeInTheDocument()
    expect(fetchRequest).toHaveBeenNthCalledWith(1, '/api/session', {
      body: JSON.stringify({ token: testRailwayToken }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
    expect(JSON.stringify(queryClient.getMutationCache().getAll())).not.toContain(testRailwayToken)
    expect(screen.getByRole('link', { name: 'delete it on Railway' })).toHaveAttribute(
      'href',
      'https://railway.com/account/tokens',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign out this browser' }))

    expect(await screen.findByLabelText('Workspace token')).toBeVisible()
    expect(fetchRequest).toHaveBeenLastCalledWith('/api/session', { method: 'DELETE' })
  })

  it('returns to the token form when the session expired', async () => {
    const fetchRequest = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        createJsonResponse({ error: 'The session is invalid or expired.' }, 401),
      )
    renderTokenForm(fetchRequest)

    submitToken()
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out this browser' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your session expired. Enter your workspace token again.',
    )
    expect(screen.getByLabelText('Workspace token')).toBeVisible()
  })
})
