import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useDisconnectSession } from '@/session/hooks/use-disconnect-session'

function resolveDisconnectLabel(isPending: boolean, hasError: boolean) {
  if (isPending) return 'Signing out...'
  if (hasError) return 'Sign out failed. Try again'
  return 'Sign out this browser'
}

export function SessionControls({ children }: Readonly<{ children?: ReactNode }>) {
  const disconnect = useDisconnectSession()

  return (
    <section aria-labelledby="connected-title" className="w-full">
      <h2 id="connected-title" className="text-3xl leading-tight sm:text-4xl">
        Connected to Railway
      </h2>

      {children}

      <div className="border-t border-[#706d60] pt-5">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={disconnect.isPending}
          focusableWhenDisabled={disconnect.isPending}
          aria-describedby={disconnect.error ? 'sign-out-error' : undefined}
          onClick={() => disconnect.mutate({})}
          className="w-full"
        >
          {resolveDisconnectLabel(disconnect.isPending, disconnect.error !== null)}
        </Button>
        {disconnect.error ? (
          <p id="sign-out-error" role="alert" className="sr-only">
            {disconnect.error.message}
          </p>
        ) : null}
      </div>
    </section>
  )
}
