import { Button } from '@/components/ui/button'
import { useDisconnectSession } from '@/hooks/session/use-disconnect-session'

export function SessionControls() {
  const disconnect = useDisconnectSession()

  return (
    <section aria-labelledby="connected-title" className="w-full">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8f8c81]">Session / Ready</p>
      <h2 id="connected-title" className="mt-4 text-3xl leading-tight sm:text-4xl">
        Connected to Railway
      </h2>
      <p role="status" className="mt-4 leading-7 text-[#c9c5b9]">
        Railway accepted your workspace token.
      </p>

      {disconnect.error ? (
        <p
          role="alert"
          className="mt-6 border-l-2 border-[#d97767] bg-[#2d201e] px-4 py-3 text-sm leading-6 text-[#f0b8ae]"
        >
          {disconnect.error.message}
        </p>
      ) : null}

      <div className="mt-9 border-t border-[#706d60] pt-7">
        <Button
          type="button"
          variant="outline"
          disabled={disconnect.isPending}
          onClick={() => disconnect.mutate({})}
          className="h-12 w-full border-[#d59c55] bg-transparent px-5 font-mono text-xs uppercase tracking-[0.16em] text-[#f4f0e6] hover:bg-[#d59c55] hover:text-[#141613] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55]"
        >
          {disconnect.isPending ? 'Signing out...' : 'Sign out this browser'}
        </Button>
      </div>
    </section>
  )
}
