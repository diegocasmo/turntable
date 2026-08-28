import type { ReactNode } from 'react'
import { SignOutAction } from '@/session/components/sign-out-action'
import { TokenForm } from '@/session/components/token-form'
import type { SessionState } from '@/session/schema'

type TurntablePageProps = Readonly<{
  children?: ReactNode
  sessionState: SessionState
}>

export function TurntablePage({ children, sessionState }: TurntablePageProps) {
  const authenticated = sessionState === 'authenticated'
  return (
    <div className="relative grid min-h-dvh grid-rows-[auto_1fr_auto] overflow-x-hidden bg-canvas text-text">
      <p aria-label="Session status" className="sr-only" role="status">
        {authenticated ? 'Connected to Railway.' : null}
      </p>
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--color-grid)_1px,transparent_1px),linear-gradient(90deg,var(--color-grid)_1px,transparent_1px)] [background-size:42px_42px]"
      />

      {authenticated ? (
        <header className="relative flex flex-wrap items-center justify-between gap-3 border-b border-border bg-panel/95 px-5 py-4 sm:px-8">
          <p className="min-w-0 break-words font-label text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Turntable / Railway control
          </p>
          <SignOutAction />
        </header>
      ) : null}

      <main className="relative flex min-h-0 items-stretch justify-center px-4 py-5 sm:px-6 sm:py-8 lg:py-12">
        <div
          className={`${authenticated ? 'flex max-w-7xl flex-col' : 'max-w-5xl'} w-full rounded-panel border border-border bg-panel/95 shadow-[14px_14px_0_var(--color-shadow)]`}
        >
          {authenticated ? (
            <div className="flex flex-1 p-5 sm:p-8 lg:p-10">
              <section aria-labelledby="connected-title" className="w-full">
                <h2 id="connected-title" className="sr-only">
                  Connected to Railway
                </h2>
                {children}
              </section>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <header className="relative overflow-hidden border-b border-border p-6 sm:p-8 lg:border-r lg:border-b-0 lg:p-12">
                <p className="font-label text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  Railway container control
                </p>
                <h1
                  id="page-title"
                  className="mt-3 text-5xl leading-none tracking-[-0.05em] sm:text-6xl lg:mt-5 lg:text-8xl"
                >
                  Turntable
                </h1>
                <p className="mt-4 max-w-md text-base leading-7 text-text-soft sm:text-lg lg:mt-7 lg:leading-8">
                  Spin Railway containers up and down.
                </p>

                <div
                  aria-hidden="true"
                  className="relative mt-14 hidden aspect-square w-52 rounded-full border border-border lg:block"
                >
                  <div className="absolute inset-4 rounded-full border border-border" />
                  <div className="absolute inset-1/2 h-px w-[120%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] bg-accent" />
                  <div className="absolute inset-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent bg-panel" />
                </div>
              </header>

              <div className="flex items-start p-6 sm:p-8 lg:min-h-[30rem] lg:items-center lg:p-12">
                <TokenForm expired={sessionState === 'expired'} />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative px-6 pb-8 text-center font-label text-xs uppercase tracking-[0.16em] text-text-muted">
        Unofficial. Not a Railway product.
      </footer>
    </div>
  )
}
