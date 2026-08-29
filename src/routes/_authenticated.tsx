import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { TurntablePage } from '@/components/turntable-page'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (context.sessionState !== 'authenticated') {
      const notice =
        context.sessionState === 'expired' || context.sessionState === 'token-rejected'
          ? context.sessionState
          : undefined
      throw redirect({
        replace: true,
        search: { redirect: location.href, ...(notice ? { notice } : {}) },
        to: '/connect',
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <TurntablePage sessionState="authenticated">
      <Outlet />
    </TurntablePage>
  )
}
