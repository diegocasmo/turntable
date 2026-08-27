import { XIcon } from '@phosphor-icons/react/X'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type EntitySearchInputProps = Readonly<{
  label: string
  onQueryChange: (query: string) => void
  query: string
  resultCount: number
}>

export function EntitySearchInput({
  label,
  onQueryChange,
  query,
  resultCount,
}: EntitySearchInputProps) {
  const inputId = useId()
  const resultsId = `${inputId}-results`
  const entityName = label.toLowerCase()

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block font-mono text-xs uppercase tracking-[0.16em] text-foreground-soft"
      >
        Search {entityName}s
      </label>
      <div className="relative mt-2">
        <Input
          id={inputId}
          aria-describedby={resultsId}
          className="h-10 border-border bg-popover pr-11 text-sm text-foreground"
          placeholder={`Filter ${entityName}s`}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
        {query === '' ? null : (
          <Button
            type="button"
            aria-label={`Clear ${entityName} search`}
            className="absolute top-1/2 right-0 size-10 -translate-y-1/2 shadow-none"
            size="icon-xs"
            variant="ghost"
            onClick={() => onQueryChange('')}
          >
            <XIcon aria-hidden="true" weight="bold" />
          </Button>
        )}
      </div>
      <p id={resultsId} aria-live="polite" className="sr-only" role="status">
        {resultCount} {entityName}
        {resultCount === 1 ? '' : 's'} {query.trim() === '' ? 'available' : 'found'}.
      </p>
    </div>
  )
}
