import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Route as RootRoute } from '../routes/__root'
import { NotFoundPage } from './not-found-page'

describe('Not found page', () => {
  it('is the root not-found component', () => {
    expect(RootRoute.options.notFoundComponent).toBe(NotFoundPage)
  })

  it('renders a way back to Turntable', () => {
    const markup = renderToStaticMarkup(<NotFoundPage />)

    expect(markup).toContain('<main')
    expect(markup).toContain('Page not found')
    expect(markup).toContain('href="/"')
  })
})
