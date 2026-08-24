import { useState } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { NativeSelect, NativeSelectOption } from './ui/native-select'

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

            <div className="mt-10 grid max-w-xl gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label
                  htmlFor="token-preview"
                  className="uppercase tracking-[0.12em] text-[#c9c5b9]"
                >
                  Token preview
                </Label>
                <Input
                  id="token-preview"
                  type="password"
                  value="workspace-token"
                  readOnly
                  className="border-[#706d60] bg-[#141613] text-[#f4f0e6]"
                />
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="service-preview"
                  className="uppercase tracking-[0.12em] text-[#c9c5b9]"
                >
                  Service preview
                </Label>
                <NativeSelect
                  id="service-preview"
                  defaultValue="worker"
                  className="w-full [&_select]:border-[#706d60] [&_select]:bg-[#141613] [&_select]:text-[#f4f0e6]"
                >
                  <NativeSelectOption value="worker">Worker</NativeSelectOption>
                  <NativeSelectOption value="web">Web</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Badge
                role="status"
                aria-live="polite"
                aria-atomic="true"
                variant="outline"
                className="h-auto gap-3 border-[#706d60] px-4 py-3 uppercase tracking-[0.16em] text-[#f4f0e6]"
              >
                <span aria-hidden="true" className="size-2 rounded-full bg-[#d59c55]" />
                {controlsRespond ? 'Controls respond' : 'Scaffold ready'}
              </Badge>

              <Button
                type="button"
                variant="outline"
                className="h-auto border-[#d59c55] bg-transparent px-4 py-3 uppercase tracking-[0.16em] text-[#f4f0e6] hover:bg-[#d59c55] hover:text-[#141613] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55]"
                onClick={() => setControlsRespond(true)}
              >
                {controlsRespond ? 'Controls respond' : 'Verify controls'}
              </Button>
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
