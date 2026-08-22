import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TurntablePlaceholder } from './turntable-placeholder'

describe('Turntable placeholder', () => {
  it('renders the main application heading', () => {
    render(<TurntablePlaceholder />)

    const main = screen.getByRole('main')

    expect(within(main).getByRole('heading', { level: 1, name: 'Turntable' })).toBeVisible()
  })
})
