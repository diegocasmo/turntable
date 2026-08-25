type NamedOption = Readonly<{ id: string; name: string }>

export function resolvePickerSelection<Option extends NamedOption>(
  options: readonly Option[] | undefined,
  selectedId: string | undefined,
  preferredId?: string,
) {
  const selectedOption = options?.find((option) => option.id === selectedId)
  let defaultOption: Option | undefined

  if (selectedId === undefined) {
    defaultOption = options?.find((option) => option.id === preferredId)
    if (!defaultOption && options?.length === 1) defaultOption = options[0]
  }

  const isStale = selectedId !== undefined && options !== undefined && !selectedOption
  return { defaultOption, isStale, selectedOption }
}
