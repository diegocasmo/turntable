import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceActionsMenu } from '@/deployment/components/service-actions-menu'
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

function renderServiceCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <EntityCard
        actions={<ServiceActionsMenu deployment={deployment} serviceName="Web" target={target} />}
        entity={{ id: testRailwayServiceId, name: 'Web' }}
        meta={<StatusBadge status="SUCCESS" />}
      />
    </QueryClientProvider>,
  )
}

async function openActions() {
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Web' }))
  return screen.findByRole('menuitem', { name: 'Spin up' })
}

beforeEach(() => {
  spinDownMock.mockReset().mockResolvedValue(true)
  spinUpMock.mockReset().mockResolvedValue('deployment-new')
})

describe('service card actions', () => {
  it('opens from the keyboard and has no card or refresh action', async () => {
    renderServiceCard()
    const card = screen.getByRole('article', { name: 'Web' })
    const trigger = screen.getByRole('button', { name: 'Actions for Web' })

    expect(card).not.toHaveAttribute('tabindex')
    expect(card.querySelector('a')).toBeNull()
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })

    expect(await screen.findByRole('menuitem', { name: 'Spin up' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Spin down' })).toBeVisible()
    expect(screen.queryByRole('menuitem', { name: 'Refresh' })).not.toBeInTheDocument()
  })

  it('uses the existing spin-up confirmation and target', async () => {
    renderServiceCard()
    fireEvent.click(await openActions())
    expect(await screen.findByRole('alertdialog')).toHaveAccessibleName('Spin up deployment?')
    fireEvent.click(screen.getByRole('button', { name: 'Spin up' }))

    await waitFor(() => expect(spinUpMock).toHaveBeenCalledWith({ data: target }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Spin up completed for Web')
  })

  it('prevents a duplicate spin-down request while the mutation is pending', async () => {
    const response = Promise.withResolvers<boolean>()
    spinDownMock.mockReturnValue(response.promise)
    renderServiceCard()
    await openActions()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Spin down' }))
    const confirm = screen.getByRole('button', { name: 'Spin down' })
    fireEvent.click(confirm)

    await waitFor(() => expect(confirm).toHaveAttribute('aria-disabled', 'true'))
    fireEvent.click(confirm)
    expect(spinDownMock).toHaveBeenCalledOnce()
    response.resolve(true)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('keeps a failed service action visible and recoverable', async () => {
    spinDownMock.mockRejectedValue(new Error('Railway could not stop Web.'))
    renderServiceCard()
    await openActions()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Spin down' }))
    fireEvent.click(screen.getByRole('button', { name: 'Spin down' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Railway could not stop Web.')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Actions for Web' })).toBeEnabled()
  })
})
