import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  EntitySelectionFailure,
  EntitySelectionPage,
} from '@/selection/components/entity-selection-page'
import type { SelectionProgress } from '@/selection/components/selection-breadcrumbs'

const selectionProgress: SelectionProgress = { step: 'project' }

describe('EntitySelectionPage', () => {
  it('renders current and future steps without Home', () => {
    render(
      <EntitySelectionPage selectionProgress={selectionProgress} title="Choose a project">
        <p>Page content</p>
      </EntitySelectionPage>,
    )
    const breadcrumb = screen.getByRole('navigation', { name: 'Selection progress' })

    expect(within(breadcrumb).queryByText('Home')).not.toBeInTheDocument()
    expect(within(breadcrumb).getByText('Project')).toHaveClass('pr-1')
    expect(within(breadcrumb).queryByRole('link', { name: 'Project' })).not.toBeInTheDocument()
    expect(within(breadcrumb).getByRole('button', { name: 'Environment' })).toBeVisible()
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
