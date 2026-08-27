export function findEntityById<Entity extends Readonly<{ id: string }>>(
  entities: readonly Entity[] | undefined,
  id: string | undefined,
) {
  return entities?.find((entity) => entity.id === id)
}
