import { createFileRoute, redirect } from '@tanstack/react-router'
import { TurntablePage } from '@/components/turntable-page'
import { sessionQueryOptions } from '@/session/queries'
import { connectSearchSchema } from '@/session/schema'

export const Route = createFileRoute('/connect')({
  validateSearch: connectSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.sessionState === 'authenticated') {
      throw redirect({ href: search.redirect, replace: true })
    }

    if (
      (context.sessionState === 'expired' || context.sessionState === 'token-rejected') &&
      search.notice !== context.sessionState
    ) {
      throw redirect({
        replace: true,
        search: { ...search, notice: context.sessionState },
        to: '/connect',
      })
    }
  },
  component: ConnectRoute,
})

function ConnectRoute() {
  const { queryClient, sessionState } = Route.useRouteContext()
  const { notice, redirect: destination } = Route.useSearch()
  const navigate = Route.useNavigate()

  async function clearSessionNotice() {
    queryClient.setQueryData(sessionQueryOptions.queryKey, 'signed-out')
    await navigate({
      replace: true,
      search: { redirect: destination },
      viewTransition: true,
    })
  }

  return notice ? (
    <TurntablePage
      sessionNotice={notice}
      sessionState={sessionState}
      onSessionNoticeDismiss={clearSessionNotice}
      onSessionNoticeSubmit={clearSessionNotice}
    />
  ) : (
    <TurntablePage sessionState={sessionState} />
  )
}
