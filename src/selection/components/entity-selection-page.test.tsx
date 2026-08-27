import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  EntitySelectionFailure,
  EntitySelectionPage,
  EntitySelectionSkeleton,
} from '@/selection/components/entity-selection-page'

const breadcrumbs = [
  { kind: 'current', label: 'Project' },
  { description: 'Select a project first', kind: 'disabled', label: 'Environment' },
  { description: 'Select an environment first', kind: 'disabled', label: 'Services' },
] as const

function renderPage(overrides: Readonly<{ onRefresh?: () => void; pending?: boolean }> = {}) {
  return render(
    <EntitySelectionPage
      breadcrumbs={breadcrumbs}
      refreshLabel="Projects"
      refreshPending={overrides.pending ?? false}
      title="Choose a project"
      onRefresh={overrides.onRefresh ?? vi.fn()}
    >
      <p>Page content</p>
    </EntitySelectionPage>,
  )
}

describe('EntitySelectionPage', () => {
  it('renders semantic links, current state, and explained future steps', async () => {
    renderPage()
    const breadcrumb = screen.getByRole('navigation', { name: 'Selection progress' })

    expect(within(breadcrumb).queryByText('Home')).not.toBeInTheDocument()
    expect(within(breadcrumb).getByText('Project')).toHaveAttribute('aria-current', 'page')
    expect(within(breadcrumb).queryByRole('link', { name: 'Project' })).not.toBeInTheDocument()
    const environment = within(breadcrumb).getByRole('button', { name: 'Environment' })
    expect(environment).toHaveAttribute('aria-disabled', 'true')

    fireEvent.focus(environment)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Select a project first')
  })

  it('focuses the heading without focusing a text field', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Choose a project' })).toHaveFocus()
  })

  it('keeps refresh labelled and disabled while pending', () => {
    const onRefresh = vi.fn()
    const page = renderPage({ onRefresh })

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
    expect(refresh).toHaveAttribute('aria-busy', 'true')
    expect(refresh).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Page content').parentElement).toHaveAttribute('aria-busy', 'true')
  })

  it('keeps simple loading and error regions available', async () => {
    const onRetry = vi.fn()
    const page = render(<EntitySelectionSkeleton />)
    expect(page.container.firstChild).toHaveAttribute('aria-hidden', 'true')
    page.rerender(
      <EntitySelectionFailure error={new Error('Could not load projects.')} onRetry={onRetry} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load projects.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(onRetry).toHaveBeenCalledOnce())
  })
})
