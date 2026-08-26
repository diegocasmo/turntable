import fuzzysort from 'fuzzysort'
import { useMemo, useState } from 'react'
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from '@/components/ui/combobox'

const maximumVisibleOptions = 20

export type PickerOption = Readonly<{ id: string; name: string }>
export type PickerGroup = PickerOption & Readonly<{ items: readonly PickerOption[] }>
export type PickerState =
  | Readonly<{ kind: 'blocked'; parent: string }>
  | Readonly<{ kind: 'empty' | 'ready' }>

export type PickerModel = Readonly<{
  groups?: readonly PickerGroup[]
  label: string
  onSelect: (id: string) => void
  options?: readonly PickerOption[]
  selectedOption: PickerOption | undefined
  state: PickerState
}>

type PickerEntry = Readonly<{ group?: PickerGroup; option: PickerOption }>

function resolvePlaceholder(state: PickerState, label: string) {
  const noun = label.toLowerCase()
  const article = noun === 'environment' ? 'an' : 'a'
  if (state.kind === 'blocked') {
    const parentArticle = state.parent === 'environment' ? 'an' : 'a'
    return `Choose ${parentArticle} ${state.parent} first`
  }
  if (state.kind === 'empty') return `No ${noun}s`
  return `Choose ${article} ${noun}`
}

function collectPickerEntries(
  groups: readonly PickerGroup[] | undefined,
  options: readonly PickerOption[] | undefined,
) {
  if (groups) {
    return groups.flatMap((group) => group.items.map((option) => ({ group, option })))
  }
  return (options ?? []).map((option) => ({ option }))
}

function filterPickerEntries(entries: readonly PickerEntry[], query: string) {
  const normalizedQuery = query.trim()
  if (normalizedQuery === '') {
    return { entries: entries.slice(0, maximumVisibleOptions), total: entries.length }
  }

  const results = fuzzysort.go(normalizedQuery, entries, {
    keys: [(entry) => entry.option.name, (entry) => entry.group?.name ?? ''],
    limit: maximumVisibleOptions,
  })
  return { entries: results.map((result) => result.obj), total: results.total }
}

function groupPickerEntries(entries: readonly PickerEntry[]) {
  const groups = new Map<string, { id: string; items: PickerOption[]; name: string }>()
  for (const entry of entries) {
    if (!entry.group) continue
    const group = groups.get(entry.group.id)
    if (group) group.items.push(entry.option)
    else
      groups.set(entry.group.id, {
        id: entry.group.id,
        items: [entry.option],
        name: entry.group.name,
      })
  }
  return [...groups.values()]
}

function resolveResultStatus(label: string, query: string, shown: number, total: number) {
  if (total === 0) return ''
  const noun = `${label.toLowerCase()}${total === 1 ? '' : 's'}`
  if (shown < total) return `${shown} of ${total} ${noun} shown.`
  return `${total} ${noun} ${query.trim() === '' ? 'available' : 'found'}.`
}

function renderOption(option: PickerOption) {
  return (
    <ComboboxItem
      key={option.id}
      value={option}
      className="data-highlighted:bg-[#d59c55] data-highlighted:text-[#141613]"
    >
      {option.name}
    </ComboboxItem>
  )
}

export function Picker({ groups, label, onSelect, options, selectedOption, state }: PickerModel) {
  const [query, setQuery] = useState('')
  const entries = useMemo(() => collectPickerEntries(groups, options), [groups, options])
  const results = useMemo(() => filterPickerEntries(entries, query), [entries, query])
  const visibleOptions = results.entries.map((entry) => entry.option)
  const visibleGroups = groupPickerEntries(results.entries)
  const inputId = `${label.toLowerCase()}-picker`
  const resultStatusId = `${inputId}-results`
  const disabled = state.kind !== 'ready'

  return (
    <div className="border-t border-[#4d4e47] pt-3">
      <label
        htmlFor={inputId}
        className="block font-mono text-xs uppercase tracking-[0.16em] text-[#c9c5b9]"
      >
        {label}
      </label>
      <Combobox<PickerOption>
        autoHighlight
        disabled={disabled}
        filteredItems={groups ? visibleGroups : visibleOptions}
        isItemEqualToValue={(option, value) => option.id === value.id}
        itemToStringLabel={(option) => option.name}
        itemToStringValue={(option) => option.id}
        items={groups ?? options ?? []}
        limit={maximumVisibleOptions}
        value={selectedOption ?? null}
        onInputValueChange={(value, details) =>
          setQuery(details.reason === 'input-change' ? value : '')
        }
        onValueChange={(option) => {
          if (option) onSelect(option.id)
        }}
      >
        <ComboboxInput
          id={inputId}
          aria-describedby={`selection-status ${resultStatusId}`}
          className="mt-2 w-full border-[#706d60] bg-[#242522] text-[#f4f0e6]"
          disabled={disabled}
          placeholder={resolvePlaceholder(state, label)}
          triggerLabel={`Show ${label.toLowerCase()} options`}
        />
        <ComboboxContent className="border border-[#706d60] bg-[#242522] text-[#f4f0e6] shadow-[3px_3px_0_#090a08] ring-0">
          <ComboboxEmpty
            aria-label={`${label} empty results`}
            role="note"
            className="text-[#c9c5b9]"
          >
            No {label.toLowerCase()}s found.
          </ComboboxEmpty>
          <ComboboxList>
            {groups ? (
              visibleGroups.map((group) => (
                <ComboboxGroup
                  key={group.id}
                  items={group.items}
                  className="border-t border-[#4d4e47] first:border-t-0"
                >
                  <ComboboxLabel className="font-mono uppercase tracking-[0.12em] text-[#8f8c81]">
                    {group.name}
                  </ComboboxLabel>
                  <ComboboxCollection>{renderOption}</ComboboxCollection>
                </ComboboxGroup>
              ))
            ) : (
              <ComboboxCollection>{renderOption}</ComboboxCollection>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p
        id={resultStatusId}
        aria-label={`${label} results`}
        aria-live="polite"
        role="status"
        className="sr-only"
      >
        {state.kind === 'ready'
          ? resolveResultStatus(label, query, results.entries.length, results.total)
          : null}
      </p>
    </div>
  )
}
