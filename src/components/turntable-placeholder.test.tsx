import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TurntablePlaceholder } from './turntable-placeholder'

describe('Turntable placeholder', () => {
  it('renders the application name and scaffold state', () => {
    const markup = renderToStaticMarkup(<TurntablePlaceholder />)

    expect(markup).toContain('<main')
    expect(markup).toContain('Turntable')
    expect(markup).toContain('Scaffold ready')
  })
})
