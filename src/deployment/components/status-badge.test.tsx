import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { StatusBadge } from '@/deployment/components/status-badge'
import type { DeploymentStatus } from '@/railway/deployment-status'

vi.mock('@phosphor-icons/react/CircleNotch', () => ({
  CircleNotchIcon: (props: ComponentProps<'svg'>) => (
    <svg {...props} data-status-indicator="activity" />
  ),
}))
vi.mock('@phosphor-icons/react/HourglassSimple', () => ({
  HourglassSimpleIcon: (props: ComponentProps<'svg'>) => (
    <svg {...props} data-status-indicator="waiting" />
  ),
}))
vi.mock('@phosphor-icons/react/Warning', () => ({
  WarningIcon: (props: ComponentProps<'svg'>) => (
    <svg {...props} data-status-indicator="attention" />
  ),
}))

const indicatorCases = [
  { indicator: 'activity', status: 'DEPLOYING' },
  { indicator: 'waiting', status: 'QUEUED' },
  { indicator: 'attention', status: 'NEEDS_APPROVAL' },
] as const satisfies ReadonlyArray<Readonly<{ indicator: string; status: DeploymentStatus }>>

describe('deployment status badge', () => {
  it.each(indicatorCases)('shows the $indicator indicator for $status', ({ indicator, status }) => {
    render(<StatusBadge status={status} />)

    const badge = screen.getByRole('status')
    expect(badge.children).toHaveLength(1)
    expect(badge.firstElementChild).toHaveAttribute('data-status-indicator', indicator)
  })

  it.each([{ status: 'SUCCESS' }, { status: null }] as const)(
    'does not show an indicator for $status',
    ({ status }) => {
      render(<StatusBadge status={status} />)

      expect(screen.getByRole('status').children).toHaveLength(0)
    },
  )
})
