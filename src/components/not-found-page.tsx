import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#141613] px-6 py-16 text-[#f4f0e6]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(244,240,230,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(244,240,230,0.05)_1px,transparent_1px)] [background-size:42px_42px]"
      />

      <section
        aria-labelledby="not-found-title"
        className="relative w-full max-w-2xl border border-[#706d60] bg-[#1d201c]/95 p-8 shadow-[14px_14px_0_#090a08] sm:p-12"
      >
        <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#d59c55]">
          Route signal lost
        </p>
        <h1 id="not-found-title" className="text-5xl leading-none tracking-[-0.04em] sm:text-7xl">
          Page not found
        </h1>
        <p className="mt-8 max-w-lg text-lg leading-8 text-[#c9c5b9]">
          This address does not point to a Turntable screen.
        </p>
        <a href="/" className={buttonVariants({ className: 'mt-10', variant: 'secondary' })}>
          Return to Turntable
        </a>
      </section>
    </main>
  )
}
