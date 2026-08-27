import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotFoundPage } from '@/components/not-found-page'
import { Route as RootRoute } from '@/routes/__root'

describe('Not found page', () => {
  it('is the root not-found component', () => {
    expect(RootRoute.options.notFoundComponent).toBe(NotFoundPage)
  })

  it('renders a way back to Turntable', () => {
    render(<NotFoundPage />)

    const main = screen.getByRole('main')

    expect(within(main).getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    expect(within(main).getByRole('link', { name: 'Return to Turntable' })).toHaveAttribute(
      'href',
      '/projects',
    )
  })
})
