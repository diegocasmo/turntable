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
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8f8c81]">Session / Ready</p>
      <h2 id="connected-title" className="mt-4 text-3xl leading-tight sm:text-4xl">
        Connected to Railway
      </h2>

      {children}

      <div className="border-t border-[#706d60] pt-5">
        <Button
          type="button"
          variant="outline"
          disabled={disconnect.isPending}
          aria-describedby={disconnect.error ? 'sign-out-error' : undefined}
          onClick={() => disconnect.mutate({})}
          className="h-12 w-full border-[#d59c55] bg-transparent px-5 font-mono text-xs uppercase tracking-[0.16em] text-[#f4f0e6] hover:bg-[#d59c55] hover:text-[#141613] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55]"
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
