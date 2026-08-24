import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TurntablePlaceholder } from '@/components/turntable-placeholder'

describe('Turntable placeholder', () => {
  it('renders the main application heading', () => {
    render(<TurntablePlaceholder />)

    const main = screen.getByRole('main')

    expect(within(main).getByRole('heading', { level: 1, name: 'Turntable' })).toBeVisible()
    expect(within(main).getByLabelText('Token preview')).toBeVisible()
    expect(within(main).getByRole('combobox', { name: 'Service preview' })).toHaveTextContent(
      'Worker',
    )
    expect(within(main).getByRole('status')).toHaveTextContent('Scaffold ready')
  })

  it('confirms that the vendored controls respond', () => {
    render(<TurntablePlaceholder />)

    fireEvent.click(screen.getByRole('button', { name: 'Verify controls' }))

    expect(screen.getByRole('status')).toHaveTextContent('Controls respond')
  })
})
