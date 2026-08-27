import { AsyncButton } from '@/components/ui/button'
import { useDisconnectSession } from '@/session/hooks/use-disconnect-session'

function resolveDisconnectLabel(isPending: boolean, hasError: boolean) {
  if (isPending) return 'Signing out...'
  if (hasError) return 'Sign out failed. Try again'
  return 'Sign out this browser'
}

export function SignOutAction() {
  const disconnect = useDisconnectSession()

  return (
    <div className="shrink-0">
      <AsyncButton
        type="button"
        aria-describedby={disconnect.error ? 'sign-out-error' : undefined}
        className="min-h-11 sm:min-h-8"
        pending={disconnect.isPending}
        size="sm"
        variant="secondary"
        onClick={() => disconnect.mutate({})}
      >
        {resolveDisconnectLabel(disconnect.isPending, disconnect.error !== null)}
      </AsyncButton>
      {disconnect.error ? (
        <p id="sign-out-error" className="sr-only" role="alert">
          {disconnect.error.message}
        </p>
      ) : null}
    </div>
  )
}
