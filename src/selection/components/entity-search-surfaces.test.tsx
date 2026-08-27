import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { EntityCard } from '@/selection/components/entity-card-grid'
import { EntitySearchSurfaces } from '@/selection/components/entity-search-surfaces'

const entities = [
  { id: 'web', name: 'Web' },
  { id: 'api-worker', name: 'API worker' },
  { id: 'worker', name: 'Worker' },
]

function TestSurfaces() {
  const [query, setQuery] = useState('')

  return (
    <EntitySearchSurfaces
      emptyMessage="No projects are available."
      entities={entities}
      label="Project"
      query={query}
      renderCard={(entity) => <EntityCard entity={entity} />}
      onQueryChange={setQuery}
    />
  )
}

describe('EntitySearchSurfaces', () => {
  it('uses a normal search input to filter cards in fuzzy order', () => {
    render(<TestSurfaces />)
    const input = screen.getByRole('searchbox', { name: 'Search projects' })

    fireEvent.change(input, { target: { value: 'wkr' } })

    expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual([
      'Worker',
      'API worker',
    ])
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('clears a no-results query and restores every card', () => {
    render(<TestSurfaces />)
    const input = screen.getByRole('searchbox', { name: 'Search projects' })

    fireEvent.change(input, { target: { value: 'zzzz' } })
    expect(screen.getByText('No results for “zzzz”.')).toHaveAttribute('role', 'status')
    const clear = screen.getByRole('button', { name: 'Clear project search' })
    expect(screen.getAllByRole('button')).toEqual([clear])
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
    fireEvent.click(clear)

    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })
})
