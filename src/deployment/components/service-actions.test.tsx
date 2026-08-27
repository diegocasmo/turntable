import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceActions } from '@/deployment/components/service-actions'
import { StatusBadge } from '@/deployment/components/status-badge'
import { EntityCard } from '@/selection/components/entity-card-grid'
import {
  testRailwayEnvironmentId,
  testRailwayProjectId,
  testRailwayServiceId,
} from '@/test/railway'

const { spinDownMock, spinUpMock } = vi.hoisted(() => ({
  spinDownMock: vi.fn(),
  spinUpMock: vi.fn(),
}))

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-start')>()
  return { ...original, useServerFn: (serverFunction: unknown) => serverFunction }
})
vi.mock('@/deployment/spin-down-deployment', () => ({ spinDownDeployment: spinDownMock }))
vi.mock('@/deployment/spin-up-deployment', () => ({ spinUpDeployment: spinUpMock }))

const target = {
  environmentId: testRailwayEnvironmentId,
  projectId: testRailwayProjectId,
  serviceId: testRailwayServiceId,
}
const deployment = { id: 'deployment-1', status: 'SUCCESS' as const }

function renderServiceCard(currentDeployment: Readonly<typeof deployment> | null = deployment) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <EntityCard
        actions={
          <ServiceActions deployment={currentDeployment} serviceName="Web" target={target} />
        }
        entity={{ id: testRailwayServiceId, name: 'Web' }}
        meta={<StatusBadge status={currentDeployment?.status ?? null} />}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  spinDownMock.mockReset().mockResolvedValue(true)
  spinUpMock.mockReset().mockResolvedValue('deployment-new')
})

describe('service card actions', () => {
  it('shows both actions directly and does not make the card interactive', () => {
    renderServiceCard()
    const card = screen.getByRole('article', { name: 'Web' })

    expect(within(card).getByRole('button', { name: 'Spin up Web' })).toBeEnabled()
    expect(within(card).getByRole('button', { name: 'Spin down Web' })).toBeEnabled()
    expect(within(card).queryByRole('button', { name: 'Actions for Web' })).not.toBeInTheDocument()
    expect(card.querySelector('a')).toBeNull()
  })

  it('shows why spin down is unavailable without hiding the action', () => {
    renderServiceCard(null)

    const spinDown = screen.getByRole('button', { name: 'Spin down Web' })
    expect(spinDown).toHaveAttribute('aria-disabled', 'true')
    spinDown.focus()
    fireEvent.click(spinDown)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Spin down requires a successful deployment.')).toBeVisible()
  })

  it('shows spin-up request progress in the confirmation button', async () => {
    const response = Promise.withResolvers<string>()
    spinUpMock.mockReturnValue(response.promise)
    renderServiceCard()
    fireEvent.click(screen.getByRole('button', { name: 'Spin up Web' }))
    fireEvent.click(screen.getByRole('button', { name: 'Spin up Web' }))

    const pendingButton = await screen.findByRole('button', { name: 'Spinning up...' })
    expect(pendingButton).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(pendingButton)
    expect(spinUpMock).toHaveBeenCalledOnce()

    response.resolve('deployment-new')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByText('Spin up request accepted for Web.')).toBeInTheDocument()
  })

  it('keeps a failed spin-down request visible and retryable', async () => {
    spinDownMock
      .mockRejectedValueOnce(new Error('Railway could not stop Web.'))
      .mockResolvedValueOnce(true)
    renderServiceCard()
    fireEvent.click(screen.getByRole('button', { name: 'Spin down Web' }))
    fireEvent.click(screen.getByRole('button', { name: 'Spin down Web' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Railway could not stop Web.')
    const retry = screen.getByRole('button', { name: 'Spin down Web' })
    expect(retry).not.toHaveAttribute('aria-busy')
    fireEvent.click(retry)

    await waitFor(() => expect(spinDownMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})
