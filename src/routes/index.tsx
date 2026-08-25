import { createFileRoute } from '@tanstack/react-router'
import { TurntablePage } from '@/components/turntable-page'
import { readSessionState } from '@/session/functions'

export const Route = createFileRoute('/')({
  loader: () => readSessionState(),
  component: IndexPage,
})

function IndexPage() {
  return <TurntablePage sessionState={Route.useLoaderData()} />
}
