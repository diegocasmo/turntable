import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@/components/ui/native-select'

export type PickerOption = Readonly<{ id: string; name: string }>
export type PickerGroup = PickerOption & Readonly<{ options: readonly PickerOption[] }>
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

function renderOption(option: PickerOption) {
  return (
    <NativeSelectOption key={option.id} value={option.id}>
      {option.name}
    </NativeSelectOption>
  )
}

export function Picker({ groups, label, onSelect, options, selectedOption, state }: PickerModel) {
  const choices =
    groups?.map((group) => (
      <NativeSelectOptGroup key={group.id} label={group.name}>
        {group.options.map(renderOption)}
      </NativeSelectOptGroup>
    )) ?? options?.map(renderOption)

  return (
    <label htmlFor={label} className="block border-t border-[#4d4e47] pt-3">
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#c9c5b9]">{label}</span>
      <NativeSelect
        id={label}
        aria-describedby="selection-status"
        className="mt-2 w-full"
        disabled={state.kind !== 'ready'}
        value={selectedOption?.id ?? ''}
        onChange={(event) => onSelect(event.currentTarget.value)}
      >
        <NativeSelectOption value="" disabled>
          {resolvePlaceholder(state, label)}
        </NativeSelectOption>
        {choices}
      </NativeSelect>
    </label>
  )
}
