import { SelectionPickers } from '@/selection/components/selection-pickers'
import { SessionControls } from '@/session/components/session-controls'
import { TokenForm } from '@/session/components/token-form'
import type { SessionState } from '@/session/schema'

type TurntablePageProps = Readonly<{
  sessionState: SessionState
}>

export function TurntablePage({ sessionState }: TurntablePageProps) {
  return (
    <div className="relative grid min-h-screen grid-rows-[1fr_auto] overflow-hidden bg-background text-foreground">
      <p aria-label="Session status" className="sr-only" role="status">
        {sessionState === 'authenticated' ? 'Connected to Railway.' : null}
      </p>
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] [background-size:42px_42px]"
      />

      <main className="relative grid items-start justify-items-center px-6 py-6 sm:py-8 lg:place-items-center lg:py-12">
        <section
          aria-labelledby="page-title"
          className="w-full max-w-5xl border border-border bg-card/95 shadow-[14px_14px_0_var(--shadow-color)]"
        >
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <header className="relative overflow-hidden border-b border-border p-6 sm:p-8 lg:border-r lg:border-b-0 lg:p-12">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Railway container control
              </p>
              <h1
                id="page-title"
                className="mt-3 text-5xl leading-none tracking-[-0.05em] sm:text-6xl lg:mt-5 lg:text-8xl"
              >
                Turntable
              </h1>
              <p className="mt-4 max-w-md text-base leading-7 text-foreground-soft sm:text-lg lg:mt-7 lg:leading-8">
                One service. Live state. Clear controls.
              </p>

              <div
                aria-hidden="true"
                className="relative mt-14 hidden aspect-square w-52 rounded-full border border-border lg:block"
              >
                <div className="absolute inset-4 rounded-full border border-border" />
                <div className="absolute inset-1/2 h-px w-[120%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] bg-primary" />
                <div className="absolute inset-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-card" />
              </div>
            </header>

            <div className="flex items-start p-6 sm:p-8 lg:min-h-[30rem] lg:items-center lg:p-12">
              {sessionState === 'authenticated' ? (
                <SessionControls>
                  <SelectionPickers />
                </SessionControls>
              ) : (
                <TokenForm expired={sessionState === 'expired'} />
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative px-6 pb-8 text-center font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
        Unofficial. Not a Railway product.
      </footer>
    </div>
  )
}
