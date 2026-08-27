import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { TurntablePage } from '@/components/turntable-page'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (context.sessionState !== 'authenticated') {
      throw redirect({
        replace: true,
        search: { redirect: location.href },
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
