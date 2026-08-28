import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  EntitySelectionFailure,
  EntitySelectionPage,
} from '@/selection/components/entity-selection-page'
import type { SelectionProgress } from '@/selection/components/selection-breadcrumbs'

const selectionProgress: SelectionProgress = { step: 'project' }

function renderComponent({
  children = <p>Page content</p>,
  ...props
}: Partial<ComponentProps<typeof EntitySelectionPage>> = {}) {
  return render(
    <EntitySelectionPage selectionProgress={selectionProgress} title="Choose a project" {...props}>
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
    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument()
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
