import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  EntitySelectionFailure,
  EntitySelectionPage,
} from '@/selection/components/entity-selection-page'

const breadcrumbs = [
  { kind: 'current', label: 'Project' },
  { description: 'Select a project first', kind: 'disabled', label: 'Environment' },
  { description: 'Select an environment first', kind: 'disabled', label: 'Services' },
] as const

function renderComponent({
  children = <p>Page content</p>,
  ...props
}: Partial<ComponentProps<typeof EntitySelectionPage>> = {}) {
  return render(
    <EntitySelectionPage
      breadcrumbs={breadcrumbs}
      refreshLabel="Projects"
      refreshPending={false}
      title="Choose a project"
      onRefresh={vi.fn()}
      {...props}
    >
      {children}
    </EntitySelectionPage>,
  )
}

describe('EntitySelectionPage', () => {
  it('renders current and future steps without Home', () => {
    renderComponent()
    const breadcrumb = screen.getByRole('navigation', { name: 'Selection progress' })

    expect(within(breadcrumb).queryByText('Home')).not.toBeInTheDocument()
    expect(within(breadcrumb).getByText('Project')).toBeVisible()
    expect(within(breadcrumb).queryByRole('link', { name: 'Project' })).not.toBeInTheDocument()
    expect(within(breadcrumb).getByRole('button', { name: 'Environment' })).toBeVisible()
  })

  it('blocks duplicate refreshes while pending', () => {
    const onRefresh = vi.fn()
    const page = renderComponent({ onRefresh })

    fireEvent.click(screen.getByRole('button', { name: 'Refresh projects' }))
    expect(onRefresh).toHaveBeenCalledOnce()
    page.rerender(
      <EntitySelectionPage
        breadcrumbs={breadcrumbs}
        refreshLabel="Projects"
        refreshPending
        title="Choose a project"
        onRefresh={onRefresh}
      >
        <p>Page content</p>
      </EntitySelectionPage>,
    )
    const refresh = screen.getByRole('button', { name: 'Refresh projects' })
    expect(refresh).toHaveTextContent('Refreshing')
    fireEvent.click(refresh)
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('shows a failure and retries', async () => {
    const onRetry = vi.fn()
    render(
      <EntitySelectionFailure error={new Error('Could not load projects.')} onRetry={onRetry} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load projects.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(onRetry).toHaveBeenCalledOnce())
  })
})
