import { createFileRoute } from '@tanstack/react-router'
import { TurntablePage } from '@/components/turntable-page'
import { selectionSearchSchema } from '@/selection/schema'
import { readSessionState } from '@/session/read-session-state'

export const Route = createFileRoute('/')({
  validateSearch: selectionSearchSchema,
  loader: () => readSessionState(),
  component: IndexPage,
})

function IndexPage() {
  return <TurntablePage initialSessionState={Route.useLoaderData()} />
}
