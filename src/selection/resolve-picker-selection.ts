import { findEntityById } from '@/selection/find-entity-by-id'

type NamedOption = Readonly<{ id: string; name: string }>

export function resolvePickerSelection<Option extends NamedOption>(
  options: readonly Option[] | undefined,
  selectedId: string | undefined,
) {
  const selectedOption = findEntityById(options, selectedId)
  const isStale = selectedId !== undefined && options !== undefined && !selectedOption
  return { isStale, selectedOption }
}
