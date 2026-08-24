import { useState } from 'react'

export function TurntablePlaceholder() {
  const [controlsRespond, setControlsRespond] = useState(false)

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#141613] px-6 py-16 text-[#f4f0e6]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(244,240,230,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(244,240,230,0.05)_1px,transparent_1px)] [background-size:42px_42px]"
      />

      <section
        aria-labelledby="page-title"
        className="relative w-full max-w-4xl border border-[#706d60] bg-[#1d201c]/95 p-8 shadow-[14px_14px_0_#090a08] sm:p-12"
      >
        <div className="grid gap-12 md:grid-cols-[1fr_17rem] md:items-center">
          <div>
            <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#d59c55]">
              Railway container control
            </p>
            <h1 id="page-title" className="text-6xl leading-none tracking-[-0.05em] sm:text-8xl">
              Turntable
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#c9c5b9]">
              One service. Live state. Clear controls.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-3 border border-[#706d60] px-4 py-3 font-mono text-xs uppercase tracking-[0.16em]">
                <span aria-hidden="true" className="size-2 rounded-full bg-[#d59c55]" />
                Scaffold ready
              </div>
              <button
                type="button"
                className="border border-[#d59c55] px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] hover:bg-[#d59c55] hover:text-[#141613] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55]"
                onClick={() => setControlsRespond(true)}
              >
                {controlsRespond ? 'Controls respond' : 'Verify controls'}
              </button>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="relative mx-auto aspect-square w-full max-w-64 rounded-full border border-[#706d60]"
          >
            <div className="absolute inset-5 rounded-full border border-[#706d60]" />
            <div className="absolute inset-1/2 h-px w-[118%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] bg-[#d59c55]" />
            <div className="absolute inset-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d59c55] bg-[#1d201c]" />
          </div>
        </div>
      </section>
    </main>
  )
}
