import { createFileRoute } from '@tanstack/react-router'
import { TurntablePage } from '@/components/turntable-page'
import { SelectionPickers } from '@/selection/components/selection-pickers'
import { selectionSearchSchema } from '@/selection/schema'

export const Route = createFileRoute('/')({
  validateSearch: selectionSearchSchema,
  loader: ({ context }) => context.sessionState,
  component: IndexPage,
})

function IndexPage() {
  return (
    <TurntablePage sessionState={Route.useLoaderData()}>
      <SelectionPickers />
    </TurntablePage>
  )
}
