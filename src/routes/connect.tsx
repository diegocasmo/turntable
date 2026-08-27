import { createFileRoute, redirect } from '@tanstack/react-router'
import { TurntablePage } from '@/components/turntable-page'
import { connectSearchSchema } from '@/session/schema'

export const Route = createFileRoute('/connect')({
  validateSearch: connectSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.sessionState === 'authenticated') {
      throw redirect({ href: search.redirect, replace: true })
    }
  },
  component: ConnectRoute,
})

function ConnectRoute() {
  const { sessionState } = Route.useRouteContext()
  return <TurntablePage sessionState={sessionState} />
}
